import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Flat surface, elevation by border only. Never nest cards. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-panel", className)}
      {...props}
    />
  );
}
