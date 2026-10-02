"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { PreviewState } from "./usePreview";

const RETRY_MS = 3000;
const MAX_RETRIES = 40; // ~2 minutes of ImageKit processing

interface EditorCanvasProps {
  name: string;
  preview: PreviewState;
  originalUrl: string | undefined;
  comparing: boolean;
  stale: boolean;
  onGenerate: () => void;
  onUnlock: () => void;
  /** Replaces the preview while a step needs direct manipulation (crop box). */
  stage?: ReactNode;
  /** The floating group bar. */
  children: ReactNode;
}

/**
 * The image on a crop-marked sheet. AI renders can answer 202 while ImageKit
 * works, so a failed load of an async preview is retried until it lands.
 */
export function EditorCanvas({
  name,
  preview,
  originalUrl,
  comparing,
  stale,
  onGenerate,
  onUnlock,
  stage,
  children,
}: EditorCanvasProps) {
  const url = preview.status === "ready" ? preview.url : undefined;
  const isAsync = preview.status === "ready" && preview.async;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [split, setSplit] = useState(50);

  // A new URL starts a fresh set of attempts.
  const [trackedUrl, setTrackedUrl] = useState(url);
  if (trackedUrl !== url) {
    setTrackedUrl(url);
    setAttempt(0);
    setFailed(null);
  }

  const processing = !!url && isAsync && loaded !== url && failed !== url;

  function onError() {
    if (!url) return;
    if (isAsync && attempt < MAX_RETRIES) {
      setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
    } else {
      setFailed(url);
    }
  }

  const showImage = url ?? originalUrl;

  return (
    <div className="relative flex min-h-[50vh] min-w-0 flex-1 flex-col">
      <div className="crop-marks flex-1">
        <div className="relative size-full min-h-[50vh] overflow-hidden border border-line-strong bg-panel">
          {stage}
          {!stage && showImage && (
            // Signed ImageKit URL: next/image would re-sign or alter it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${showImage}#${attempt}`}
              src={showImage}
              alt={`${name}, edited preview`}
              onLoad={() => setLoaded(showImage)}
              onError={onError}
              className="absolute inset-0 size-full object-contain"
            />
          )}

          {!stage && comparing && originalUrl && url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt={`${name}, original`}
                className="absolute inset-0 size-full object-contain"
                style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 w-px bg-fg"
                style={{ left: `${split}%` }}
              />
              <span className="absolute top-3 left-3 bg-ink/80 px-1.5 font-mono text-xs uppercase">
                Original
              </span>
              <span className="absolute top-3 right-3 bg-ink/80 px-1.5 font-mono text-xs uppercase">
                Edited
              </span>
            </>
          )}

          {!stage && (preview.status === "loading" || processing) && (
            <div
              role="status"
              className="absolute inset-x-0 top-0 flex items-center gap-3 bg-ink/80 px-4 py-2 text-sm"
            >
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
              />
              {processing ? "AI is processing… this can take a minute." : "Rendering preview…"}
            </div>
          )}

          {!stage && (stale || preview.status === "locked" || preview.status === "error" || (url && failed === url)) && (
            <div className="absolute inset-x-0 bottom-16 flex justify-center px-4">
              <div className="flex max-w-md flex-col items-center gap-3 bg-ink/85 px-5 py-4 text-center">
                {preview.status === "locked" ? (
                  <>
                    <p className="text-sm">A step needs a plan that unlocks it.</p>
                    <Button variant="primary" size="sm" onClick={onUnlock}>
                      See plans
                    </Button>
                  </>
                ) : preview.status === "error" ? (
                  <p role="alert" className="text-sm text-danger">
                    {preview.message}
                  </p>
                ) : url && failed === url ? (
                  <p role="alert" className="text-sm text-danger">
                    This preview couldn&apos;t be rendered. Change a setting or try again later.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      AI steps render only when you ask, since each render uses AI credits.
                    </p>
                    <Button variant="primary" size="sm" onClick={onGenerate}>
                      Generate preview
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!stage && comparing && originalUrl && url && (
        <label className="mt-3 flex items-center gap-3 text-sm text-muted">
          Compare
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="h-5 flex-1 cursor-pointer accent-fg"
            aria-label="Compare original and edited"
          />
        </label>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4 max-lg:static max-lg:mt-3 max-lg:px-0">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}
