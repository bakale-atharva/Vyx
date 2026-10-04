"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

const MIN_CLIP = 0.1; // seconds

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

const round = (t: number) => Math.round(t * 10) / 10;

/**
 * A timeline under the player with start and end handles. Times are in
 * seconds of the video as it is before the trim step.
 */
export function TrimTimeline({
  duration,
  start,
  end,
  playhead,
  onChange,
}: {
  duration: number;
  start: number;
  end: number;
  playhead: number | null;
  onChange: (range: { start: number; end: number }) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);
  const pct = (t: number) => `${(Math.min(Math.max(t, 0), duration) / duration) * 100}%`;

  function set(which: "start" | "end", t: number) {
    if (which === "start") onChange({ start: round(Math.min(Math.max(t, 0), end - MIN_CLIP)), end });
    else onChange({ start, end: round(Math.max(Math.min(t, duration), start + MIN_CLIP)) });
  }

  function timeAt(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return ((clientX - rect.left) / rect.width) * duration;
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    const which = e.currentTarget.dataset.handle as "start" | "end";
    dragging.current = which;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Untracked pointer; dragging still works.
    }
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (dragging.current) set(dragging.current, timeAt(e.clientX));
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const which = e.currentTarget.dataset.handle as "start" | "end";
    const step = e.shiftKey ? 1 : 0.1;
    const value = which === "start" ? start : end;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(which, value - step);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") set(which, value + step);
    else if (e.key === "Home") set(which, 0);
    else if (e.key === "End") set(which, duration);
    else return;
    e.preventDefault();
  }

  const handle = (which: "start" | "end") => {
    const value = which === "start" ? start : end;
    return (
      <button
        type="button"
        role="slider"
        data-handle={which}
        aria-label={which === "start" ? "Trim start" : "Trim end"}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={value}
        aria-valuetext={fmt(value)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
        onKeyDown={onKeyDown}
        className="absolute top-0 h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none border border-ink bg-fg"
        style={{ left: pct(value) }}
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div ref={trackRef} className="relative h-10 border border-line-strong bg-surface select-none">
        {/* Outside the clip is dimmed; the kept range is a solid rule frame. */}
        <div className="absolute inset-y-0 left-0 bg-ink/60" style={{ width: pct(start) }} />
        <div className="absolute inset-y-0 right-0 bg-ink/60" style={{ left: pct(end) }} />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 border-y-2 border-fg"
          style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
        />
        {playhead !== null && (
          <div aria-hidden="true" className="absolute inset-y-0 w-px bg-magenta" style={{ left: pct(playhead) }} />
        )}
        {handle("start")}
        {handle("end")}
      </div>
      <p className={cn("flex justify-between font-mono text-xs text-muted tabular-nums")}>
        <span>Start {fmt(start)}</span>
        <span>Clip {fmt(end - start)}</span>
        <span>End {fmt(end)}</span>
      </p>
    </div>
  );
}
