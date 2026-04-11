/**
 * Tier Gating Configuration
 * Config-driven limits for each subscription tier.
 */

export type TierName = 'free' | 'mini' | 'max';

export interface TierLimits {
  label: string;
  price: number; // monthly price in USD
  agentRunsPerDay: number;
  miniApps: number;
  teamMembers: number;
  vaults: number;
  apiCallsPerHour: number;
  storageGb: number;
  features: {
    advancedAnalytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    sseNotifications: boolean;
    exportPdf: boolean;
    multiVault: boolean;
  };
}

export const TIER_CONFIG: Record<TierName, TierLimits> = {
  free: {
    label: 'Free',
    price: 0,
    agentRunsPerDay: 10,
    miniApps: 3,
    teamMembers: 2,
    vaults: 1,
    apiCallsPerHour: 60,
    storageGb: 1,
    features: {
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
      sseNotifications: false,
      exportPdf: false,
      multiVault: false,
    },
  },
  mini: {
    label: 'Mini',
    price: 29,
    agentRunsPerDay: 100,
    miniApps: 25,
    teamMembers: 10,
    vaults: 5,
    apiCallsPerHour: 500,
    storageGb: 10,
    features: {
      advancedAnalytics: true,
      customBranding: false,
      prioritySupport: false,
      sseNotifications: true,
      exportPdf: true,
      multiVault: true,
    },
  },
  max: {
    label: 'Max',
    price: 99,
    agentRunsPerDay: -1, // unlimited
    miniApps: -1,
    teamMembers: -1,
    vaults: -1,
    apiCallsPerHour: 5000,
    storageGb: 100,
    features: {
      advancedAnalytics: true,
      customBranding: true,
      prioritySupport: true,
      sseNotifications: true,
      exportPdf: true,
      multiVault: true,
    },
  },
};

/**
 * Check if a usage count is within the tier limit.
 * Returns true if allowed, false if limit exceeded.
 * -1 means unlimited.
 */
export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}

/**
 * Get the tier config for a given tier name (with fallback to free).
 */
export function getTierConfig(tier: string): TierLimits {
  return TIER_CONFIG[(tier as TierName)] || TIER_CONFIG.free;
}

/**
 * Calculate usage percentage (capped at 100).
 */
export function usagePercent(current: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}
