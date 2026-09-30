import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { insertAsset } from "./lib/insertAsset";
import { ASSET_LIMITS } from "./lib/plans";
import { validateStoredFile } from "./lib/storedFile";
import { userFolder } from "./lib/validateUpload";
import { waitForReady } from "./lib/waitForReady";
import {
  assetInsertFields,
  assetKindValidator,
  editRequestValidator,
} from "./schema";
import { getCurrentUser } from "./users";

/** Max jobs in flight per user (also bounds ImageKit extension-unit abuse). */
const MAX_CONCURRENT = 5;
/** How many recent job rows to consider when counting. */
const RECENT_LIMIT = 25;
/** Polling budget per attempt; the job reschedules itself when it runs out. */
const BUDGET_MS = { image: 60_000, video: 5 * 60_000 } as const;
const MAX_ATTEMPTS = 6;
const RESCHEDULE_DELAY_MS = 5_000;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 200;

export const create = internalMutation({
  args: {
    ownerId: v.id("users"),
    parentAssetId: v.id("assets"),
    kind: assetKindValidator,
    name: v.string(),
    recipe: v.any(),
    request: editRequestValidator,
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get("users", args.ownerId);
    if (!owner) throw new Error("Owner not found");

    const recent = await ctx.db
      .query("edits")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .take(RECENT_LIMIT);
    const processing = recent.filter((e) => e.status === "processing").length;
    if (processing >= MAX_CONCURRENT) {
      throw new ConvexError({ code: "TOO_MANY_PROCESSING" });
    }
    // In-flight jobs will each become an asset, so they count toward the quota.
    if (owner.assetCount + processing >= ASSET_LIMITS[owner.plan]) {
      throw new ConvexError({ code: "QUOTA_ASSETS" });
    }

    const id = await ctx.db.insert("edits", {
      ...args,
      status: "processing",
      attempts: 0,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.edits.process, { editId: id });
    return id;
  },
});

export const getForProcess = internalQuery({
  args: { editId: v.id("edits") },
  handler: async (ctx, { editId }) => {
    const edit = await ctx.db.get("edits", editId);
    if (!edit) return null;
    const user = await ctx.db.get("users", edit.ownerId);
    return user ? { edit, user } : null;
  },
});

export const bump = internalMutation({
  args: { editId: v.id("edits") },
  handler: async (ctx, { editId }) => {
    const edit = await ctx.db.get("edits", editId);
    if (edit) await ctx.db.patch("edits", editId, { attempts: edit.attempts + 1 });
    return null;
  },
});

export const fail = internalMutation({
  args: { editId: v.id("edits"), errorCode: v.string() },
  handler: async (ctx, { editId, errorCode }) => {
    const edit = await ctx.db.get("edits", editId);
    if (edit) await ctx.db.patch("edits", editId, { status: "failed", errorCode });
    return null;
  },
});

/** Turn a finished job into an asset and remove the job, atomically. */
export const complete = internalMutation({
  args: { editId: v.id("edits"), asset: v.object(assetInsertFields) },
  handler: async (ctx, { editId, asset }) => {
    const edit = await ctx.db.get("edits", editId);
    if (!edit) return null;
    const assetId = await insertAsset(ctx, asset);
    await ctx.db.delete("edits", editId);
    return assetId;
  },
});

/**
 * Render the edit in ImageKit and store the result. ImageKit answers 202 while
 * it works, so we poll with backoff; if the budget runs out the job
 * reschedules itself (up to MAX_ATTEMPTS) instead of holding one long action.
 */
export const process = internalAction({
  args: { editId: v.id("edits") },
  handler: async (ctx, { editId }): Promise<null> => {
    const job = await ctx.runQuery(internal.edits.getForProcess, { editId });
    if (!job || job.edit.status !== "processing") return null;
    const { edit, user } = job;

    const fail = (errorCode: string) =>
      ctx.runMutation(internal.edits.fail, { editId, errorCode });

    try {
      const signedUrl = await ctx.runAction(internal.imagekit.signUrl, {
        src: edit.request.src,
        transformation: edit.request.transformation,
        queryParameters: edit.request.queryParameters,
        expiresIn: SIGNED_URL_TTL_SECONDS,
      });

      const state = await waitForReady(signedUrl, {
        budgetMs: BUDGET_MS[edit.kind],
      });
      if (state === "pending") {
        if (edit.attempts + 1 >= MAX_ATTEMPTS) {
          await fail("TIMEOUT");
          return null;
        }
        await ctx.runMutation(internal.edits.bump, { editId });
        await ctx.scheduler.runAfter(RESCHEDULE_DELAY_MS, internal.edits.process, {
          editId,
        });
        return null;
      }
      if (state === "failed") {
        await fail("PROCESSING_FAILED");
        return null;
      }

      const { fileId } = await ctx.runAction(internal.imagekit.uploadFromUrl, {
        url: signedUrl,
        fileName: edit.name,
        folder: userFolder(user.clerkId, edit.kind).replace(/\/$/, ""),
      });

      // Same authoritative checks as a client upload (size, duration, quota).
      const { file, deleteIfOwned } = await validateStoredFile(ctx, {
        user,
        clerkId: user.clerkId,
        fileId,
        kind: edit.kind,
      });
      try {
        await ctx.runMutation(internal.edits.complete, {
          editId,
          asset: {
            ownerId: user._id,
            kind: edit.kind,
            fileId,
            filePath: file.filePath,
            name: file.name,
            mime: file.mime,
            size: file.size,
            width: file.width,
            height: file.height,
            duration: file.duration,
            parentAssetId: edit.parentAssetId,
            recipe: edit.recipe,
          },
        });
      } catch (err) {
        await deleteIfOwned();
        throw err;
      }
    } catch (err) {
      console.error("Edit processing failed:", err);
      await fail(
        err instanceof ConvexError && typeof err.data?.code === "string"
          ? err.data.code
          : "PROCESSING_FAILED",
      );
    }
    return null;
  },
});

/** The caller's in-flight and failed jobs, for the gallery's processing cards. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const edits = await ctx.db
      .query("edits")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(RECENT_LIMIT);
    return edits.map((e) => ({
      _id: e._id,
      parentAssetId: e.parentAssetId,
      kind: e.kind,
      name: e.name,
      status: e.status,
      errorCode: e.errorCode ?? null,
      createdAt: e.createdAt,
    }));
  },
});

/** Remove a failed job card. */
export const dismiss = mutation({
  args: { editId: v.id("edits") },
  handler: async (ctx, { editId }) => {
    const user = await getCurrentUser(ctx);
    const edit = await ctx.db.get("edits", editId);
    if (!user || !edit || edit.ownerId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    if (edit.status !== "failed") {
      throw new ConvexError({ code: "STILL_PROCESSING" });
    }
    await ctx.db.delete("edits", editId);
    return null;
  },
});

export const pruneOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("edits")
      .withIndex("by_created", (q) => q.lt("createdAt", Date.now() - RETENTION_MS))
      .take(PRUNE_BATCH);
    for (const edit of old) await ctx.db.delete("edits", edit._id);
    return null;
  },
});
