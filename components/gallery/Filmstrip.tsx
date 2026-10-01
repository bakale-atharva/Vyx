"use client";

import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "@/components/ui/icons";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { formatDimensions, formatDuration } from "@/lib/format";

export interface PendingEdit {
  _id: Id<"edits">;
  name: string;
  kind: "image" | "video";
  status: "processing" | "failed";
}

interface FilmstripProps {
  assets: readonly Doc<"assets">[];
  pending: readonly PendingEdit[];
  selectedId: string | undefined;
  thumbUrl: (id: string) => string | undefined;
  onSelect: (id: Id<"assets">) => void;
  onDismiss: (id: Id<"edits">) => void;
  onThumbError: (id: string) => void;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const FRAME = "w-32 shrink-0 sm:w-36";

/**
 * Every file as a strip of ruled frames, newest first. Rule form carries state:
 * solid = stored, dashed = processing, struck name = failed. Left and right
 * arrow keys step through the frames.
 */
export function Filmstrip({
  assets,
  pending,
  selectedId,
  thumbUrl,
  onSelect,
  onDismiss,
  onThumbError,
  canLoadMore,
  loadingMore,
  onLoadMore,
}: FilmstripProps) {
  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const frames = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-frame]"),
    );
    const index = frames.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    const next = frames[index + (e.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    e.preventDefault();
    next.focus();
    next.click();
  }

  return (
    <ul
      aria-label="Your files, newest first"
      onKeyDown={onKeyDown}
      className="flex items-start gap-3 overflow-x-auto pb-3"
    >
      {pending.map((edit) => (
        <li key={edit._id} className={FRAME}>
          <div
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-2 border border-dashed p-2 text-center",
              edit.status === "failed"
                ? "border-danger text-danger"
                : "border-line-strong text-muted",
            )}
          >
            {edit.status === "processing" ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                />
                <span className="font-mono text-xs">Processing</span>
              </>
            ) : (
              <>
                <span className="font-mono text-xs">Failed</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onDismiss(edit._id)}
                  aria-label={`Dismiss failed edit ${edit.name}`}
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>
          <p
            className={cn(
              "mt-1.5 truncate font-mono text-xs",
              edit.status === "failed" ? "text-danger line-through" : "text-subtle",
            )}
            title={edit.name}
          >
            {edit.name}
          </p>
        </li>
      ))}

      {assets.map((asset) => {
        const selected = asset._id === selectedId;
        const url = thumbUrl(asset._id);
        const measure =
          asset.kind === "video"
            ? asset.duration !== undefined
              ? formatDuration(asset.duration)
              : null
            : formatDimensions(asset.width, asset.height);
        return (
          <li key={asset._id} className={FRAME}>
            <button
              type="button"
              data-frame
              aria-pressed={selected}
              aria-label={`${asset.name}${measure ? `, ${measure}` : ""}`}
              onClick={() => onSelect(asset._id)}
              className={cn(
                "relative block aspect-square w-full cursor-pointer overflow-hidden bg-panel",
                selected
                  ? "outline-2 outline-offset-2 outline-fg"
                  : "border border-line-strong hover:border-subtle",
              )}
            >
              {url ? (
                // Signed ImageKit URL: next/image would break the signature.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => onThumbError(asset._id)}
                  className="size-full object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 animate-pulse bg-raised motion-reduce:animate-none"
                />
              )}
              {asset.kind === "video" && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 bottom-1 inline-flex size-6 items-center justify-center bg-ink/80 text-fg"
                >
                  <PlayIcon width={14} height={14} />
                </span>
              )}
              {asset.parentAssetId && (
                <span className="absolute top-1 left-1 bg-fg px-1 font-mono text-[10px] font-semibold text-accent-fg uppercase">
                  Edited
                </span>
              )}
            </button>
            <p
              className={cn(
                "mt-1.5 truncate font-mono text-xs",
                selected ? "text-fg" : "text-subtle",
              )}
              title={asset.name}
            >
              {asset.name}
            </p>
            {measure && (
              <p className="font-mono text-xs text-subtle tabular-nums">
                {measure}
              </p>
            )}
          </li>
        );
      })}

      {(canLoadMore || loadingMore) && (
        <li className={cn(FRAME, "flex aspect-square items-center justify-center")}>
          <Button
            variant="secondary"
            onClick={onLoadMore}
            loading={loadingMore}
            disabled={!canLoadMore}
          >
            Load more
          </Button>
        </li>
      )}
    </ul>
  );
}
