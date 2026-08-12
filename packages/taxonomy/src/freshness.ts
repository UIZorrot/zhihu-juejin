import type { DomainFreshnessPolicy } from "./types";

export const freshnessPolicyVersion = "freshness-v2";

export const domainFreshnessPolicies: Readonly<Record<string, DomainFreshnessPolicy>> = {
  "artificial-intelligence": {
    recentQueryShare: 0.9,
    recentWindowDays: 30,
    historicalMaximumAgeDays: 730,
    decayHalfLifeDays: 120,
  },
  "software-open-source": {
    recentQueryShare: 0.85,
    recentWindowDays: 30,
    historicalMaximumAgeDays: 1_825,
    decayHalfLifeDays: 240,
  },
  "graphics-3d": {
    recentQueryShare: 0.75,
    recentWindowDays: 180,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 730,
  },
  "visual-design": {
    recentQueryShare: 0.7,
    recentWindowDays: 365,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 1_095,
  },
  "music-audio": {
    recentQueryShare: 0.7,
    recentWindowDays: 365,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 1_095,
  },
  "product-growth-media": {
    recentQueryShare: 0.85,
    recentWindowDays: 30,
    historicalMaximumAgeDays: 1_825,
    decayHalfLifeDays: 240,
  },
  "finance-investing": {
    recentQueryShare: 0.9,
    recentWindowDays: 30,
    historicalMaximumAgeDays: 1_825,
    decayHalfLifeDays: 120,
  },
  "hardware-semiconductors": {
    recentQueryShare: 0.85,
    recentWindowDays: 30,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 365,
  },
  "science-mathematics": {
    recentQueryShare: 0.65,
    recentWindowDays: 730,
    historicalMaximumAgeDays: 7_300,
    decayHalfLifeDays: 3_650,
  },
  "energy-aerospace": {
    recentQueryShare: 0.8,
    recentWindowDays: 180,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 730,
  },
  "social-sciences-humanities": {
    recentQueryShare: 0.65,
    recentWindowDays: 365,
    historicalMaximumAgeDays: 7_300,
    decayHalfLifeDays: 2_555,
  },
  "games-entertainment": {
    recentQueryShare: 0.8,
    recentWindowDays: 90,
    historicalMaximumAgeDays: 3_650,
    decayHalfLifeDays: 365,
  },
};

export function getDomainFreshnessPolicy(domainId: string): DomainFreshnessPolicy {
  const policy = domainFreshnessPolicies[domainId];
  if (!policy) {
    throw new Error(`Missing freshness policy for domain: ${domainId}`);
  }
  return policy;
}
