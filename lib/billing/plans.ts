/**
 * Single source of truth for plans, features and quotas. Pure TypeScript with
 * no runtime dependencies so Next.js (UI, route handlers, server actions) and
 * Convex (via `convex/lib/plans.ts`) can both import it.
 *
 * Mirrors the Clerk Billing dashboard configuration (User Plans tab). See
 * docs/SETUP.md.
 */

export const PLANS = ["free", "pro", "ultra"] as const;
export type Plan = (typeof PLANS)[number];

/** Clerk plan slugs. */
export const PLAN_SLUGS = {
  free: "free_user",
  pro: "pro",
  ultra: "ultra",
} as const;

/** Clerk feature slugs, checked with `has({ feature })`. */
export const FEATURES = {
  // Image: core
  IMAGE_BASIC_EDITS: "image_basic_edits",
  IMAGE_FILTERS: "image_filters",
  IMAGE_TEXT_OVERLAY: "image_text_overlay",
  // Image: pro
  IMAGE_WATERMARK: "image_watermark",
  IMAGE_SMART_CROP: "image_smart_crop",
  IMAGE_BG_REMOVE: "image_bg_remove",
  IMAGE_DROP_SHADOW: "image_drop_shadow",
  IMAGE_UPSCALE: "image_upscale",
  IMAGE_RETOUCH: "image_retouch",
  // Image: ultra (generative)
  IMAGE_BG_CHANGE: "image_bg_change",
  IMAGE_GEN_FILL: "image_gen_fill",
  IMAGE_AI_EDIT: "image_ai_edit",
  IMAGE_VARIATIONS: "image_variations",
  // Video: core
  VIDEO_BASIC_EDITS: "video_basic_edits",
  VIDEO_TRIM: "video_trim",
  VIDEO_THUMBNAIL: "video_thumbnail",
  // Video: pro
  VIDEO_MUTE: "video_mute",
  VIDEO_AUDIO_EXTRACT: "video_audio_extract",
  VIDEO_TEXT_OVERLAY: "video_text_overlay",
  VIDEO_WATERMARK: "video_watermark",
  // Video: ultra (AI)
  VIDEO_AI_SUBTITLES: "video_ai_subtitles",
  VIDEO_SUBTITLE_TRANSLATE: "video_subtitle_translate",
  VIDEO_STREAMING: "video_streaming",
} as const;

export type FeatureSlug = (typeof FEATURES)[keyof typeof FEATURES];

const FREE_FEATURES: readonly FeatureSlug[] = [
  FEATURES.IMAGE_BASIC_EDITS,
  FEATURES.IMAGE_FILTERS,
  FEATURES.IMAGE_TEXT_OVERLAY,
  FEATURES.VIDEO_BASIC_EDITS,
  FEATURES.VIDEO_TRIM,
  FEATURES.VIDEO_THUMBNAIL,
];

const PRO_FEATURES: readonly FeatureSlug[] = [
  ...FREE_FEATURES,
  FEATURES.IMAGE_WATERMARK,
  FEATURES.IMAGE_SMART_CROP,
  FEATURES.IMAGE_BG_REMOVE,
  FEATURES.IMAGE_DROP_SHADOW,
  FEATURES.IMAGE_UPSCALE,
  FEATURES.IMAGE_RETOUCH,
  FEATURES.VIDEO_MUTE,
  FEATURES.VIDEO_AUDIO_EXTRACT,
  FEATURES.VIDEO_TEXT_OVERLAY,
  FEATURES.VIDEO_WATERMARK,
];

const ULTRA_FEATURES: readonly FeatureSlug[] = [
  ...PRO_FEATURES,
  FEATURES.IMAGE_BG_CHANGE,
  FEATURES.IMAGE_GEN_FILL,
  FEATURES.IMAGE_AI_EDIT,
  FEATURES.IMAGE_VARIATIONS,
  FEATURES.VIDEO_AI_SUBTITLES,
  FEATURES.VIDEO_SUBTITLE_TRANSLATE,
  FEATURES.VIDEO_STREAMING,
];

/** Features unlocked by each plan (Free 6, Pro 16, Ultra 23). */
export const PLAN_FEATURES: Record<Plan, readonly FeatureSlug[]> = {
  free: FREE_FEATURES,
  pro: PRO_FEATURES,
  ultra: ULTRA_FEATURES,
};

export function planFeatures(plan: Plan): readonly FeatureSlug[] {
  return PLAN_FEATURES[plan];
}

export function planHasFeature(plan: Plan, feature: FeatureSlug): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

/** Lowest plan that unlocks a feature (for "Pro"/"Ultra" lock badges). */
export function requiredPlan(feature: FeatureSlug): Plan {
  return PLANS.find((plan) => planHasFeature(plan, feature)) ?? "ultra";
}

const MB = 1024 * 1024;

/** Usage quotas. Code constants, not Clerk features. */
export const QUOTAS: Record<
  Plan,
  {
    maxAssets: number;
    imageBytes: number;
    videoBytes: number;
    videoSeconds: number;
  }
> = {
  free: {
    maxAssets: 25,
    imageBytes: 10 * MB,
    videoBytes: 50 * MB,
    videoSeconds: 60,
  },
  pro: {
    maxAssets: 500,
    imageBytes: 25 * MB,
    videoBytes: 200 * MB,
    videoSeconds: 5 * 60,
  },
  ultra: {
    maxAssets: 5000,
    imageBytes: 50 * MB,
    videoBytes: 1024 * MB,
    videoSeconds: 30 * 60,
  },
};

export const ASSET_LIMITS: Record<Plan, number> = {
  free: QUOTAS.free.maxAssets,
  pro: QUOTAS.pro.maxAssets,
  ultra: QUOTAS.ultra.maxAssets,
};

export const UPLOAD_LIMITS: Record<
  Plan,
  { imageBytes: number; videoBytes: number; videoSeconds: number }
> = {
  free: QUOTAS.free,
  pro: QUOTAS.pro,
  ultra: QUOTAS.ultra,
};

export const ALLOWED_MIME = {
  image: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

export function planFromSlug(slug: string | undefined | null): Plan {
  if (slug === PLAN_SLUGS.ultra) return "ultra";
  if (slug === PLAN_SLUGS.pro) return "pro";
  return "free";
}

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, ultra: 2 };

export function higherPlan(a: Plan, b: Plan): Plan {
  return PLAN_RANK[a] >= PLAN_RANK[b] ? a : b;
}

/** Resolve the plan from Clerk's `has` (live session, instant after an upgrade). */
export function getTier(has: (params: { plan: string }) => boolean): Plan {
  return has({ plan: PLAN_SLUGS.ultra })
    ? "ultra"
    : has({ plan: PLAN_SLUGS.pro })
      ? "pro"
      : "free";
}
