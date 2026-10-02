"use client";

import { useAuth } from "@clerk/nextjs";
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  ALLOWED_MIME,
  QUOTAS,
  getTier,
  type Plan,
} from "@/lib/billing/plans";
import { formatBytes, formatDuration } from "@/lib/format";

export type UploadKind = "image" | "video";

export type UploadPhase =
  | { name: "idle" }
  | {
      name: "rejected";
      title: string;
      reason: string;
      upgrade: boolean;
    }
  | {
      name: "uploading";
      file: File;
      kind: UploadKind;
      preview: string;
      progress: number;
    }
  | { name: "finishing"; file: File; kind: UploadKind; preview: string }
  | {
      name: "failed";
      file: File;
      kind: UploadKind;
      preview: string;
      title: string;
      reason: string;
      upgrade: boolean;
    };

const PLAN_NAME: Record<Plan, string> = { free: "Free", pro: "Pro", ultra: "Ultra" };
const TYPE_LIST =
  "JPG, PNG, WebP, AVIF and GIF images, and MP4, WebM and MOV videos";
const DURATION_TIMEOUT_MS = 8000;

function kindOf(file: File): UploadKind | null {
  if ((ALLOWED_MIME.image as readonly string[]).includes(file.type)) return "image";
  if ((ALLOWED_MIME.video as readonly string[]).includes(file.type)) return "video";
  return null;
}

/** Reads a video's length in the browser; null if the browser can't tell. */
function readDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const done = (value: number | null) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), DURATION_TIMEOUT_MS);
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

/**
 * One-file upload: check the plan's limits in the browser, then
 * upload-auth -> ImageKit upload (progress, cancel) -> assets.register (the
 * authoritative server check) -> open the editor.
 */
export function useUploadFlow() {
  const router = useRouter();
  const { has } = useAuth();
  const me = useQuery(api.users.me);
  const register = useAction(api.assets.register);
  const [phase, setPhase] = useState<UploadPhase>({ name: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  // `has` is undefined until Clerk loads; the server enforces limits anyway.
  const tier: Plan | null = has ? getTier(has) : null;

  const releasePreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      releasePreview();
    },
    [releasePreview],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    releasePreview();
    setPhase({ name: "idle" });
  }, [releasePreview]);

  const reject = useCallback(
    (title: string, reason: string, upgrade = false) => {
      releasePreview();
      setPhase({ name: "rejected", title, reason, upgrade });
    },
    [releasePreview],
  );

  const start = useCallback(
    async (file: File, expected?: UploadKind) => {
      const kind = kindOf(file);
      if (!kind || (expected && kind !== expected)) {
        reject(
          "This file type isn't supported",
          `"${file.name}" can't be uploaded here. Vyx accepts ${TYPE_LIST}.`,
        );
        return;
      }

      const canUpgrade = tier !== null && tier !== "ultra";
      if (tier) {
        const limits = QUOTAS[tier];
        if (me && me.usage.assets >= me.usage.limit) {
          reject(
            "Your library is full",
            `You've used all ${me.usage.limit} assets on the ${PLAN_NAME[tier]} plan. Delete some files or upgrade to add more.`,
            canUpgrade,
          );
          return;
        }
        const maxBytes = kind === "image" ? limits.imageBytes : limits.videoBytes;
        if (file.size > maxBytes) {
          reject(
            `This ${kind} is too large`,
            `"${file.name}" is ${formatBytes(file.size)}. The ${PLAN_NAME[tier]} plan allows ${kind}s up to ${formatBytes(maxBytes)}.`,
            canUpgrade,
          );
          return;
        }
      }

      releasePreview();
      const preview = URL.createObjectURL(file);
      previewRef.current = preview;

      if (kind === "video" && tier) {
        const seconds = await readDuration(preview);
        const max = QUOTAS[tier].videoSeconds;
        if (seconds !== null && seconds > max) {
          reject(
            "This video is too long",
            `"${file.name}" runs ${formatDuration(seconds)}. The ${PLAN_NAME[tier]} plan allows videos up to ${formatDuration(max)}.`,
            canUpgrade,
          );
          return;
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const fail = (title: string, reason: string, upgrade = false) =>
        setPhase({ name: "failed", file, kind, preview, title, reason, upgrade });

      setPhase({ name: "uploading", file, kind, preview, progress: 0 });
      try {
        const res = await fetch(`/api/imagekit/upload-auth?kind=${kind}`, {
          signal: controller.signal,
        });
        const params = await res.json().catch(() => null);
        if (!res.ok || !params) {
          if (params?.code === "QUOTA_ASSETS") {
            fail(
              "Your library is full",
              "You've reached your plan's asset limit. Delete some files or upgrade to add more.",
              canUpgrade,
            );
          } else {
            fail("Couldn't start the upload", "Something went wrong on our side. Try again.");
          }
          return;
        }

        const result = await upload({
          file,
          fileName: file.name,
          publicKey: params.publicKey,
          token: params.token,
          signature: params.signature,
          expire: params.expire,
          folder: params.folder,
          checks: params.checks,
          useUniqueFileName: true,
          abortSignal: controller.signal,
          onProgress: (event) => {
            if (!event.lengthComputable) return;
            const progress = event.loaded / event.total;
            setPhase((current) =>
              current.name === "uploading" ? { ...current, progress } : current,
            );
          },
        });
        if (!result.fileId) throw new Error("Upload response had no file id");

        setPhase({ name: "finishing", file, kind, preview });
        const assetId = await register({ fileId: result.fileId, kind });
        abortRef.current = null;
        router.push(`/studio/${kind}/${assetId}`);
      } catch (err) {
        if (
          err instanceof ImageKitAbortError ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          return; // Cancelled by the user; reset() already cleared the state.
        }
        if (err instanceof ConvexError) {
          const code = (err.data as { code?: string })?.code;
          if (code === "TOO_LARGE" || code === "TOO_LONG" || code === "QUOTA_ASSETS") {
            fail(
              "Your plan doesn't cover this file",
              code === "QUOTA_ASSETS"
                ? "You've reached your plan's asset limit. The upload was removed."
                : `This ${kind} is over your plan's ${code === "TOO_LONG" ? "length" : "size"} limit. The upload was removed.`,
              canUpgrade,
            );
          } else if (code === "WRONG_TYPE") {
            fail("This file type isn't supported", `Vyx accepts ${TYPE_LIST}. The upload was removed.`);
          } else {
            fail("Couldn't save the upload", "The file uploaded but couldn't be added to your library. Try again.");
          }
        } else if (err instanceof ImageKitInvalidRequestError) {
          fail(
            "The file was refused",
            "It's larger than your plan allows or isn't a supported type.",
            canUpgrade,
          );
        } else if (err instanceof ImageKitUploadNetworkError) {
          fail("Connection lost", "Check your connection and try again.");
        } else {
          fail("Upload failed", "The upload service had a problem. Try again in a minute.");
        }
      }
    },
    [me, register, reject, releasePreview, router, tier],
  );

  const retry = useCallback(() => {
    if (phase.name === "failed") void start(phase.file, phase.kind);
  }, [phase, start]);

  const cancel = reset;

  return { phase, start, cancel, reset, retry, tier, usage: me?.usage ?? null };
}
