"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import { cn } from "@/lib/cn";

export type CropRect = { x: number; y: number; width: number; height: number };

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_SIZE = 16; // natural pixels
const HANDLES: Exclude<Handle, "move">[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_POS: Record<Exclude<Handle, "move">, string> = {
  nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
  n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
  ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
  e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
  s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize",
  sw: "-left-1.5 -bottom-1.5 cursor-nesw-resize",
  w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Keep a rect inside the image and at least MIN_SIZE, in whole pixels. */
function fit(r: CropRect, nw: number, nh: number): CropRect {
  const width = clamp(Math.round(r.width), MIN_SIZE, nw);
  const height = clamp(Math.round(r.height), MIN_SIZE, nh);
  return {
    x: clamp(Math.round(r.x), 0, nw - width),
    y: clamp(Math.round(r.y), 0, nh - height),
    width,
    height,
  };
}

function resize(start: CropRect, handle: Handle, dx: number, dy: number, nw: number, nh: number): CropRect {
  if (handle === "move") return fit({ ...start, x: start.x + dx, y: start.y + dy }, nw, nh);
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;
  if (handle.includes("w")) {
    x = clamp(x + dx, 0, right - MIN_SIZE);
    width = right - x;
  }
  if (handle.includes("e")) width = clamp(width + dx, MIN_SIZE, nw - x);
  if (handle.includes("n")) {
    y = clamp(y + dy, 0, bottom - MIN_SIZE);
    height = bottom - y;
  }
  if (handle.includes("s")) height = clamp(height + dy, MIN_SIZE, nh - y);
  return fit({ x, y, width, height }, nw, nh);
}

/**
 * The image before the crop step, with a draggable crop box over it. The box
 * works in the image's natural pixels, matching the crop tool's settings.
 */
export function CropStage({
  src,
  alt,
  value,
  onChange,
}: {
  src: string;
  alt: string;
  value: CropRect;
  onChange: (rect: CropRect) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: CropRect } | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    // Measure now, then follow resizes.
    const rect = el.getBoundingClientRect();
    setFrame({ w: rect.width, h: rect.height });
    const observer = new ResizeObserver(([entry]) =>
      setFrame({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // When the image is ready, pull a box that doesn't fit (e.g. the tool's
  // defaults) into a centred 80% selection.
  function takeImage(img: HTMLImageElement) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    setNatural((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    const outside = value.x + value.width > w || value.y + value.height > h;
    if (outside) {
      onChange(fit({ x: w * 0.1, y: h * 0.1, width: w * 0.8, height: h * 0.8 }, w, h));
    }
  }

  function onLoad(e: SyntheticEvent<HTMLImageElement>) {
    takeImage(e.currentTarget);
  }

  // A cached image can finish loading before React attaches onLoad.
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) takeImage(img);
    // Only when the source changes; takeImage reads the latest props itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Where the object-contain image actually sits inside the frame.
  const layout =
    natural && frame
      ? (() => {
          const scale = Math.min(frame.w / natural.w, frame.h / natural.h);
          return {
            scale,
            left: (frame.w - natural.w * scale) / 2,
            top: (frame.h - natural.h * scale) / 2,
          };
        })()
      : null;

  /** Starts a drag; the element's `data-handle` says which edge or corner. */
  function onPointerDown(e: PointerEvent<HTMLElement>) {
    if (!natural) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Not a pointer the browser is tracking; the drag still works without capture.
    }
    const handle = (e.currentTarget.dataset.handle ?? "move") as Handle;
    drag.current = { handle, startX: e.clientX, startY: e.clientY, start: value };
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || !natural || !layout) return;
    const dx = (e.clientX - d.startX) / layout.scale;
    const dy = (e.clientY - d.startY) / layout.scale;
    onChange(resize(d.start, d.handle, dx, dy, natural.w, natural.h));
  }

  function onPointerUp() {
    drag.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!natural) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[e.key];
    if (!delta) return;
    e.preventDefault();
    // Alt + arrows resizes from the bottom-right corner; plain arrows move.
    onChange(resize(value, e.altKey ? "se" : "move", delta[0], delta[1], natural.w, natural.h));
  }

  const box =
    layout && natural
      ? {
          left: layout.left + value.x * layout.scale,
          top: layout.top + value.y * layout.scale,
          width: value.width * layout.scale,
          height: value.height * layout.scale,
        }
      : null;

  return (
    <div ref={frameRef} className="absolute inset-0 touch-none select-none">
      {/* Signed ImageKit URL: next/image would alter it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={onLoad}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />
      {box && (
        <div
          role="group"
          tabIndex={0}
          aria-label={`Crop area: ${value.width} by ${value.height} pixels at ${value.x}, ${value.y}. Arrow keys move it; Alt with arrows resizes; Shift moves by 10.`}
          data-handle="move"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="absolute cursor-move border border-fg outline-offset-4"
          style={{
            ...box,
            // Dims everything outside the crop; functional, not decoration.
            boxShadow: "0 0 0 100vmax oklch(0.12 0 0 / 0.62)",
          }}
        >
          {/* Rule-of-thirds guides. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-1/3 w-px bg-fg/35" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-fg/35" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-fg/35" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-fg/35" />
          </div>
          {HANDLES.map((h) => (
            <span
              key={h}
              aria-hidden="true"
              data-handle={h}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cn("absolute size-3 border border-ink bg-fg", HANDLE_POS[h])}
            />
          ))}
          <span className="pointer-events-none absolute -top-7 left-0 bg-ink/85 px-1.5 font-mono text-xs whitespace-nowrap tabular-nums">
            {value.width} × {value.height}
          </span>
        </div>
      )}
    </div>
  );
}
