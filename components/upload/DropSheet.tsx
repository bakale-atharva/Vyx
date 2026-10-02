"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { UploadIcon } from "@/components/ui/icons";
import { QUOTAS, type Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/cn";
import { formatBytes, formatDuration } from "@/lib/format";
import type { UploadPhase } from "./useUploadFlow";

interface DropSheetProps {
  /** A file is being dragged over the gallery. */
  dragging: boolean;
  phase: UploadPhase;
  tier: Plan | null;
  usage: { assets: number; limit: number } | null;
  onCancel: () => void;
  onClose: () => void;
  onRetry: () => void;
  onChooseAnother: () => void;
}

function LimitsLine({
  tier,
  usage,
}: {
  tier: Plan | null;
  usage: { assets: number; limit: number } | null;
}) {
  if (!tier) return null;
  const q = QUOTAS[tier];
  return (
    <p className="font-mono text-xs text-muted tabular-nums">
      Images to {formatBytes(q.imageBytes)} · Videos to{" "}
      {formatBytes(q.videoBytes)}, {formatDuration(q.videoSeconds)}
      {usage && (
        <>
          {" "}
          · {usage.assets} / {usage.limit} assets used
        </>
      )}
    </p>
  );
}

/**
 * The gallery region becomes one crop-marked proof sheet: a dashed rule while
 * waiting for a drop, a solid rule once a file is in hand.
 */
export function DropSheet({
  dragging,
  phase,
  tier,
  usage,
  onCancel,
  onClose,
  onRetry,
  onChooseAnother,
}: DropSheetProps) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const waiting = dragging && (phase.name === "idle" || phase.name === "rejected");

  // Move focus into the sheet when it asks for a decision.
  useEffect(() => {
    if (phase.name !== "idle") actionRef.current?.focus();
  }, [phase.name]);

  const busy = phase.name === "uploading" || phase.name === "finishing";
  const progress =
    phase.name === "uploading" ? phase.progress : phase.name === "finishing" ? 1 : 0;

  return (
    <div
      role="region"
      aria-label="Upload"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) onClose();
      }}
      className="absolute inset-0 z-20 bg-surface/95"
    >
      <div className="crop-marks size-full">
        <div
          className={cn(
            "relative flex size-full flex-col items-center justify-center gap-5 overflow-hidden border bg-panel p-6 text-center",
            waiting ? "border-dashed border-fg" : "border-line-strong",
          )}
        >
          {waiting ? (
            <>
              <UploadIcon width={32} height={32} className="text-muted" />
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Drop a photo or video
              </h2>
              <LimitsLine tier={tier} usage={usage} />
            </>
          ) : phase.name === "rejected" ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">
                {phase.title}
              </h2>
              <p role="alert" className="max-w-[56ch] text-muted">
                {phase.reason}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {phase.upgrade && (
                  <Link href="/pricing" className={buttonStyles("primary", "md")}>
                    See plans
                  </Link>
                )}
                <Button ref={actionRef} variant="secondary" onClick={onChooseAnother}>
                  Choose another file
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          ) : phase.name === "idle" ? null : (
            <>
              {phase.kind === "image" ? (
                // Local object URL of the user's own file, not a delivery URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={phase.preview}
                  alt=""
                  className="absolute inset-0 size-full object-contain opacity-60"
                />
              ) : (
                <video
                  src={phase.preview}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-contain opacity-60"
                />
              )}
              <div className="relative flex max-w-full flex-col items-center gap-2 bg-panel/85 px-5 py-4">
                <h2 className="max-w-[40ch] truncate text-lg font-semibold" title={phase.file.name}>
                  {phase.file.name}
                </h2>
                <p className="font-mono text-xs text-muted tabular-nums">
                  {formatBytes(phase.file.size)}
                </p>
                <p aria-live="polite" className="text-sm text-muted">
                  {phase.name === "uploading"
                    ? "Uploading…"
                    : phase.name === "finishing"
                      ? "Checking your file…"
                      : phase.reason}
                </p>
                {phase.name === "failed" && (
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {phase.upgrade && (
                      <Link href="/pricing" className={buttonStyles("primary", "md")}>
                        See plans
                      </Link>
                    )}
                    <Button ref={actionRef} variant="secondary" onClick={onRetry}>
                      Try again
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                )}
              </div>

              {busy && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 border-t border-line-strong bg-panel/90 px-4 py-3">
                  <div
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    className="h-px flex-1 bg-line-strong"
                  >
                    <div
                      className="h-full bg-fg transition-[width] duration-200"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs tabular-nums">
                    {Math.round(progress * 100)}%
                  </span>
                  <Button
                    ref={actionRef}
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                    disabled={phase.name === "finishing"}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
