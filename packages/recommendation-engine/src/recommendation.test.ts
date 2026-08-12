import { describe, expect, test } from "bun:test";
import { selectReferralAttribution } from "./attribution";
import { evaluateRecommendationAdmission } from "./quota";
import { canTransitionRecommendation } from "./status";

const availableQuota = {
  quotaDate: "2026-08-10",
  allowance: 3,
  used: 1,
};

describe("recommendation admission", () => {
  test("consumes quota and makes an independent recommendation referral-eligible", () => {
    const decision = evaluateRecommendationAdmission({
      recommenderUserId: "user-1",
      contentAuthorUserId: "author-1",
      kind: "other",
      conflictOfInterest: false,
      conflictWasDisclosed: false,
      alreadyRecommendedByUser: false,
      quota: availableQuota,
    });

    expect(decision).toEqual({
      admitted: true,
      updatedQuota: { ...availableQuota, used: 2 },
      referralEligible: true,
    });
  });

  test("self-recommendations never become referral-eligible", () => {
    const decision = evaluateRecommendationAdmission({
      recommenderUserId: "author-1",
      contentAuthorUserId: "author-1",
      kind: "self",
      conflictOfInterest: false,
      conflictWasDisclosed: false,
      alreadyRecommendedByUser: false,
      quota: availableQuota,
    });

    expect(decision.admitted).toBe(true);
    if (decision.admitted) {
      expect(decision.referralEligible).toBe(false);
    }
  });

  test("rejects exhausted quota without consuming another credit", () => {
    const exhaustedQuota = { ...availableQuota, used: 3 };
    const decision = evaluateRecommendationAdmission({
      recommenderUserId: "user-1",
      contentAuthorUserId: "author-1",
      kind: "other",
      conflictOfInterest: false,
      conflictWasDisclosed: false,
      alreadyRecommendedByUser: false,
      quota: exhaustedQuota,
    });

    expect(decision).toEqual({
      admitted: false,
      reason: "DAILY_QUOTA_EXHAUSTED",
      updatedQuota: exhaustedQuota,
    });
  });
});

describe("referral attribution", () => {
  test("attributes an accepted work to the first eligible independent recommender", () => {
    const attribution = selectReferralAttribution([
      {
        recommendationId: "later",
        recommenderUserId: "user-2",
        contentAuthorUserId: "author-1",
        kind: "other",
        status: "published",
        submittedAt: "2026-08-10T10:01:00.000Z",
        conflictOfInterest: false,
        accountEligibleForRewards: true,
      },
      {
        recommendationId: "first",
        recommenderUserId: "user-1",
        contentAuthorUserId: "author-1",
        kind: "other",
        status: "accepted",
        submittedAt: "2026-08-10T10:00:00.000Z",
        conflictOfInterest: false,
        accountEligibleForRewards: true,
      },
    ]);

    expect(attribution).toEqual({
      recommendationId: "first",
      beneficiaryUserId: "user-1",
      basis: "first_eligible_discovery",
    });
  });

  test("does not attribute self-recommendations or conflicted recommendations", () => {
    const attribution = selectReferralAttribution([
      {
        recommendationId: "self",
        recommenderUserId: "author-1",
        contentAuthorUserId: "author-1",
        kind: "self",
        status: "published",
        submittedAt: "2026-08-10T10:00:00.000Z",
        conflictOfInterest: false,
        accountEligibleForRewards: true,
      },
    ]);

    expect(attribution).toBeUndefined();
  });
});

describe("recommendation state machine", () => {
  test("requires audit before acceptance and publication", () => {
    expect(canTransitionRecommendation("submitted", "accepted")).toBe(false);
    expect(canTransitionRecommendation("submitted", "screening")).toBe(true);
    expect(canTransitionRecommendation("audit_pending", "accepted")).toBe(true);
    expect(canTransitionRecommendation("accepted", "published")).toBe(true);
  });
});
