export const PLANS = ["free", "pro", "ultra"] as const;
export type Plan = (typeof PLANS)[number];

/** Clerk plan slugs, as configured in the Clerk dashboard. */
export const PLAN_SLUGS = {
  free: "free_user",
  pro: "pro",
  ultra: "ultra",
} as const;

export const ASSET_LIMITS: Record<Plan, number> = {
  free: 25,
  pro: 500,
  ultra: 5000,
};

const MB = 1024 * 1024;

export const UPLOAD_LIMITS: Record<
  Plan,
  { imageBytes: number; videoBytes: number; videoSeconds: number }
> = {
  free: { imageBytes: 10 * MB, videoBytes: 50 * MB, videoSeconds: 60 },
  pro: { imageBytes: 25 * MB, videoBytes: 200 * MB, videoSeconds: 5 * 60 },
  ultra: { imageBytes: 50 * MB, videoBytes: 1024 * MB, videoSeconds: 30 * 60 },
};

export const ALLOWED_MIME = {
  image: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

/** Resolve the plan from a Clerk `has` function (live session, instant after upgrade). */
export function getTier(has: (params: { plan: string }) => boolean): Plan {
  return has({ plan: PLAN_SLUGS.ultra })
    ? "ultra"
    : has({ plan: PLAN_SLUGS.pro })
      ? "pro"
      : "free";
}

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, ultra: 2 };

export function planFromSlug(slug: string | undefined | null): Plan {
  if (slug === PLAN_SLUGS.ultra) return "ultra";
  if (slug === PLAN_SLUGS.pro) return "pro";
  return "free";
}

export function higherPlan(a: Plan, b: Plan): Plan {
  return PLAN_RANK[a] >= PLAN_RANK[b] ? a : b;
}
