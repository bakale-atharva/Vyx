"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";

const NUDGE_AT = 0.8;

/** "12 / 25 assets" in fixed numeric cells, with an upgrade nudge at 80%. */
export function UsageMeter() {
  const me = useQuery(api.users.me);
  if (!me) return null;
  const { assets, limit } = me.usage;
  const ratio = limit > 0 ? assets / limit : 0;
  const full = assets >= limit;
  const nudge = ratio >= NUDGE_AT && me.plan !== "ultra";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p
        className={cn(
          "font-mono text-sm tabular-nums",
          full ? "text-danger" : "text-muted",
        )}
      >
        <span className="text-fg">{assets}</span> / {limit} assets
      </p>
      {nudge && (
        <Link
          href="/pricing"
          className="text-sm font-medium underline underline-offset-4 hover:text-fg"
        >
          {full ? "Upgrade to add more" : "Running low: upgrade for more room"}
        </Link>
      )}
    </div>
  );
}
