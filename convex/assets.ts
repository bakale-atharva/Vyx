import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import {
  overlayAssetIds,
  parseRecipe,
  recipeToTransformations,
  requiredFeatures,
} from "../lib/editor/recipe";
import { OPERATIONS_BY_ID } from "../lib/editor/operations";
import {
  editFileName,
  hasFormatStep,
  resolveOutputFormat,
} from "./lib/editNaming";
import { insertAsset } from "./lib/insertAsset";
import { planHasFeature, type Plan } from "./lib/plans";
import { validateStoredFile } from "./lib/storedFile";
import { assetInsertFields, assetKindValidator } from "./schema";
import { getCurrentUser } from "./users";

const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };
const HLS_SUFFIX = "/ik-master.m3u8";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    kind: v.optional(assetKindValidator),
  },
  handler: async (ctx, { paginationOpts, kind }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return EMPTY_PAGE;
    const assets = ctx.db.query("assets");
    const q = kind
      ? assets.withIndex("by_owner_kind_created", (i) =>
          i.eq("ownerId", user._id).eq("kind", kind),
        )
      : assets.withIndex("by_owner_created", (i) => i.eq("ownerId", user._id));
    return await q.order("desc").paginate(paginationOpts);
  },
});

export const get = query({
  // A plain string so callers holding an untrusted id (URL params, recipe
  // overlays) need no cast; a malformed or foreign id simply returns null.
  args: { assetId: v.string() },
  handler: async (ctx, { assetId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const id = ctx.db.normalizeId("assets", assetId);
    if (!id) return null;
    const asset = await ctx.db.get("assets", id);
    return asset && asset.ownerId === user._id ? asset : null;
  },
});

export const getByFileId = internalQuery({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) =>
    await ctx.db
      .query("assets")
      .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
      .first(),
});

export const insert = internalMutation({
  args: assetInsertFields,
  handler: async (ctx, args) => await insertAsset(ctx, args),
});

export const remove = internalMutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get("assets", assetId);
    if (!asset) return null;
    await ctx.db.delete("assets", assetId);
    const owner = await ctx.db.get("users", asset.ownerId);
    if (owner) {
      await ctx.db.patch("users", owner._id, {
        assetCount: Math.max(0, owner.assetCount - 1),
      });
    }
    return null;
  },
});

/**
 * Authoritative check after a client-side ImageKit upload. The upload params
 * (folder, checks) are client-supplied, so we re-read the file from ImageKit
 * and validate it before it becomes an asset.
 */
export const register = action({
  args: { fileId: v.string(), kind: assetKindValidator },
  handler: async (ctx, { fileId, kind }): Promise<Id<"assets">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const clerkId = identity.subject;

    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId });
    if (!user) throw new ConvexError({ code: "NO_USER" });

    // Retry-safe: a file that is already registered is not counted twice.
    const existing = await ctx.runQuery(internal.assets.getByFileId, { fileId });
    if (existing) {
      if (existing.ownerId !== user._id) {
        throw new ConvexError({ code: "WRONG_FOLDER" });
      }
      return existing._id;
    }

    const { file, deleteIfOwned } = await validateStoredFile(ctx, {
      user,
      clerkId,
      fileId,
      kind,
    });

    try {
      return await ctx.runMutation(internal.assets.insert, {
        ownerId: user._id,
        kind,
        fileId,
        filePath: file.filePath,
        name: file.name,
        mime: file.mime,
        size: file.size,
        width: file.width,
        height: file.height,
        duration: file.duration,
      });
    } catch (err) {
      await deleteIfOwned();
      throw err;
    }
  },
});

export const getForOwner = internalQuery({
  // String id, validated here, so untrusted ids need no cast at the call site.
  args: { assetId: v.string(), clerkId: v.string() },
  handler: async (ctx, { assetId, clerkId }) => {
    const id = ctx.db.normalizeId("assets", assetId);
    if (!id) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    const asset = await ctx.db.get("assets", id);
    return user && asset && asset.ownerId === user._id ? asset : null;
  },
});

export const deleteAsset = action({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const asset = await ctx.runQuery(internal.assets.getForOwner, {
      assetId,
      clerkId: identity.subject,
    });
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });
    // ImageKit first: if it fails the row stays, so nothing is orphaned.
    await ctx.runAction(internal.imagekit.deleteFile, { fileId: asset.fileId });
    await ctx.runMutation(internal.assets.remove, { assetId });
    return null;
  },
});

/**
 * "Save as new": validate and gate the recipe on the server, then queue a job
 * that renders it in ImageKit and stores the result as a new asset (the
 * gallery shows a processing card until it lands). Returns the job id.
 *
 * The plan is enforced here even though the UI already checked `has()`; the
 * stored plan is webhook-synced, so a miss is re-checked against live Clerk.
 */
export const saveEdit = action({
  args: {
    assetId: v.id("assets"),
    recipe: v.any(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { assetId, recipe, name }): Promise<Id<"edits">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const clerkId = identity.subject;

    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId });
    if (!user) throw new ConvexError({ code: "NO_USER" });
    const asset = await ctx.runQuery(internal.assets.getForOwner, {
      assetId,
      clerkId,
    });
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });

    const parsed = parseRecipe(asset.kind, recipe);
    if (!parsed.ok) {
      throw new ConvexError({ code: "INVALID", message: parsed.error });
    }
    const ops = parsed.steps.map((s) => OPERATIONS_BY_ID[s.opId]);
    if (ops.some((op) => op.output === "audio")) {
      throw new ConvexError({ code: "DOWNLOAD_ONLY" });
    }
    if (ops.some((op) => op.pathSuffix === HLS_SUFFIX)) {
      throw new ConvexError({ code: "NOT_SAVEABLE" });
    }

    // Feature gate (defense in depth behind the UI's has() check).
    const needed = requiredFeatures(parsed.steps);
    const lockedFor = (plan: Plan) =>
      needed.find((feature) => !planHasFeature(plan, feature));
    let locked = lockedFor(user.plan);
    if (locked) {
      const livePlan = await ctx.runAction(
        internal.billing.refreshPlanFromClerk,
        { clerkId },
      );
      locked = lockedFor(livePlan);
    }
    if (locked) throw new ConvexError({ code: "LOCKED", feature: locked });

    // Overlay images must be the caller's own image assets.
    const assetPaths: Record<string, string> = {};
    for (const id of overlayAssetIds(parsed.steps)) {
      const overlay = await ctx.runQuery(internal.assets.getForOwner, {
        assetId: id,
        clerkId,
      });
      if (!overlay || overlay.kind !== "image") {
        throw new ConvexError({
          code: "INVALID",
          message: "Overlay image not found",
        });
      }
      assetPaths[id] = overlay.filePath;
    }

    let built;
    try {
      built = recipeToTransformations(parsed.steps, { assetPaths });
    } catch (err) {
      throw new ConvexError({
        code: "INVALID",
        message: err instanceof Error ? err.message : "Invalid recipe",
      });
    }
    if (built.transformation.length === 0 && !built.pathSuffix) {
      throw new ConvexError({ code: "NOTHING_TO_SAVE" });
    }

    const outputKind = ops.some((op) => op.output === "image")
      ? "image"
      : asset.kind;

    // Pin the output format so the file's real type matches its extension.
    const format = resolveOutputFormat({
      originalName: asset.name,
      steps: parsed.steps,
      outputKind,
    });
    const transformation = [...built.transformation];
    if (format && !hasFormatStep(parsed.steps)) transformation.push({ format });

    const create = () =>
      ctx.runMutation(internal.edits.create, {
        ownerId: user._id,
        parentAssetId: asset._id,
        kind: outputKind,
        name: editFileName({ originalName: asset.name, name, format }),
        recipe: parsed.steps,
        request: {
          src: asset.filePath + (built.pathSuffix ?? ""),
          transformation,
          queryParameters: built.queryParameters,
        },
      });

    try {
      return await create();
    } catch (err) {
      // A stale stored plan can look over quota right after an upgrade.
      if (err instanceof ConvexError && err.data?.code === "QUOTA_ASSETS") {
        await ctx.runAction(internal.billing.refreshPlanFromClerk, { clerkId });
        return await create();
      }
      throw err;
    }
  },
});
