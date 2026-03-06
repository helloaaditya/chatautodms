/**
 * Single source of truth for subscription tiers and validation.
 * Keeps Billing, Settings, FlowSetup, save-automation API, and webhook in sync.
 */

export type SubscriptionTier = 'free' | 'premium' | 'ultra_premium';

export const SUBSCRIPTION_TIERS: readonly SubscriptionTier[] = ['free', 'premium', 'ultra_premium'];

/** Legacy DB values map to current tiers for backward compatibility */
const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  starter: 'premium',
  pro: 'premium',
  agency: 'ultra_premium',
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  ultra_premium: 'Ultra Premium',
};

/** Normalize any value from DB/API to a valid SubscriptionTier */
export function normalizeTier(value: unknown): SubscriptionTier {
  if (value === 'free' || value === 'premium' || value === 'ultra_premium') return value;
  const s = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return LEGACY_TIER_MAP[s] ?? 'free';
}

/** Whether this tier can use Follow CTA (Ask to follow before sending DM) */
export function canUseFollowCta(tier: unknown): boolean {
  const t = normalizeTier(tier);
  return t === 'premium' || t === 'ultra_premium';
}

/** Validate tier for profile update (only allow our three tiers) */
export function isValidTierForUpdate(value: unknown): value is SubscriptionTier {
  return SUBSCRIPTION_TIERS.includes(value as SubscriptionTier);
}
