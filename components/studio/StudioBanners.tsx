"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { AlertIcon, InfoIcon } from "@/components/ui/icons";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";

const PLAN_NAME = { free: "Free", pro: "Pro", ultra: "Ultra" } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { dateStyle: "medium" });

function Banner({
  tone,
  action,
  children,
}: {
  tone: "warn" | "danger" | "info";
  action: { href: string; label: string };
  children: ReactNode;
}) {
  const Icon = tone === "info" ? InfoIcon : AlertIcon;
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-4 py-3 text-sm",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "info" && "bg-raised text-muted",
      )}
    >
      <Icon width={18} height={18} className="shrink-0" />
      <p className="min-w-0 flex-1 font-medium">{children}</p>
      <Link href={action.href} className={buttonStyles("secondary", "sm")}>
        {action.label}
      </Link>
    </div>
  );
}

/** Webhook-driven account notices from `users.me`. */
export function StudioBanners() {
  const me = useQuery(api.users.me);
  if (!me) return null;
  const { banners, plan } = me;
  const now = Date.now();
  const trialEnds =
    banners.trialEndsAt && banners.trialEndsAt > now
      ? banners.trialEndsAt
      : null;

  const trialDays = trialEnds
    ? Math.max(1, Math.ceil((trialEnds - now) / DAY_MS))
    : 0;

  return (
    <div className="flex flex-col gap-3 empty:hidden">
      {banners.pastDue && (
        <Banner
          tone="danger"
          action={{ href: "/studio/billing", label: "Update payment method" }}
        >
          Your last payment failed. Update your payment method to keep{" "}
          {PLAN_NAME[plan]}.
        </Banner>
      )}
      {banners.cancelAtPeriodEnd && banners.periodEnd && (
        <Banner
          tone="warn"
          action={{ href: "/studio/billing", label: "Manage plan" }}
        >
          Your {PLAN_NAME[plan]} plan ends on {fmtDate(banners.periodEnd)}.
        </Banner>
      )}
      {trialEnds && (
        <Banner
          tone="info"
          action={{ href: "/studio/billing", label: "View billing" }}
        >
          Your trial ends in {trialDays} {trialDays === 1 ? "day" : "days"}.
        </Banner>
      )}
      {banners.overQuota && (
        <Banner
          tone="danger"
          action={{ href: "/pricing", label: "See plans" }}
        >
          Uploads are paused. Delete assets or upgrade to add more.
        </Banner>
      )}
    </div>
  );
}
