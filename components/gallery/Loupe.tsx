"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { DownloadIcon, PlayIcon, TrashIcon } from "@/components/ui/icons";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDimensions, formatDuration } from "@/lib/format";

interface LoupeProps {
  asset: Doc<"assets">;
  /** Signed large-preview URL; undefined while it is being signed. */
  url: string | undefined;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onImageError: () => void;
}

/** The selected file, large, on a crop-marked sheet with its info bar. */
export function Loupe({
  asset,
  url,
  downloading,
  onDownload,
  onDelete,
  onImageError,
}: LoupeProps) {
  // Track which URL finished loading so a new selection shows the skeleton again.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = url !== undefined && loadedUrl === url;

  const measure =
    asset.kind === "video"
      ? asset.duration !== undefined
        ? formatDuration(asset.duration)
        : null
      : formatDimensions(asset.width, asset.height);

  return (
    <section aria-label="Selected file" className="flex min-w-0 flex-col gap-4">
      <div className="crop-marks">
        <div className="relative aspect-video w-full overflow-hidden border border-line-strong bg-panel">
          {!loaded && (
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulse bg-raised motion-reduce:animate-none"
            />
          )}
          {url && (
            // Signed ImageKit URL: next/image would re-optimise it and break the signature.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={asset.name}
              onLoad={() => setLoadedUrl(url)}
              onError={onImageError}
              className="absolute inset-0 size-full object-contain"
            />
          )}
          {asset.kind === "video" && loaded && (
            <span
              aria-hidden="true"
              className="absolute right-3 bottom-3 inline-flex size-10 items-center justify-center bg-ink/80 text-fg"
            >
              <PlayIcon />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-lg font-semibold" title={asset.name}>
            {asset.name}
          </h2>
          <p className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted tabular-nums">
            <span>{asset.kind === "video" ? "Video" : "Image"}</span>
            {measure && <span>{measure}</span>}
            {asset.parentAssetId && <Badge tone="accent">Edited</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/studio/${asset.kind}/${asset._id}`}
            className={buttonStyles("primary", "md")}
          >
            Open in editor
          </Link>
          <Button
            variant="secondary"
            loading={downloading}
            onClick={onDownload}
            aria-label={`Download ${asset.name}`}
          >
            <DownloadIcon width={18} height={18} />
            Download
          </Button>
          <Button
            variant="ghost"
            onClick={onDelete}
            aria-label={`Delete ${asset.name}`}
          >
            <TrashIcon width={18} height={18} />
            Delete
          </Button>
        </div>
      </div>
    </section>
  );
}
