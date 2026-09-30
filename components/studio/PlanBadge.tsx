"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ControlStrip } from "@/components/site/ControlStrip";
import { getTier } from "@/lib/billing/plans";

/**
 * The plan strip for the studio rail: the user's plan lit, the others dimmed.
 * Reactive to the live Clerk session, so it updates right after checkout.
 */
export function PlanBadge() {
  const { has } = useAuth();
  const tier = has ? getTier(has) : null;
  return (
    <div className="flex w-full flex-col gap-2">
      <ControlStrip current={tier} />
      {tier !== "ultra" && (
        <Link
          href="/pricing"
          className="text-xs font-medium text-muted underline underline-offset-4 hover:text-fg"
        >
          Upgrade for more tools
        </Link>
      )}
    </div>
  );
}
