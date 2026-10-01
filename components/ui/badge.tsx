import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "pro" | "ultra" | "warn";

/** The control-strip cell that marks each tier. */
const swatch: Record<BadgeTone, string> = {
  neutral: "bg-ink ring-1 ring-line-strong",
  accent: "bg-accent",
  pro: "bg-cyan",
  ultra: "bg-magenta",
  warn: "bg-yellow",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** A label led by its ink cell, like a swatch on a colour bar. */
export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 font-mono text-xs font-medium tracking-wide text-fg uppercase",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-2.5", swatch[tone])} />
      {children}
    </span>
  );
}
