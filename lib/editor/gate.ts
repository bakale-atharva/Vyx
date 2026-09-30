import type { FeatureSlug } from "../billing/plans";

/** First feature in the list the user does not have, or null if all are unlocked. */
export function firstLockedFeature(
  has: (params: { feature: string }) => boolean,
  features: readonly FeatureSlug[],
): FeatureSlug | null {
  return features.find((feature) => !has({ feature })) ?? null;
}
