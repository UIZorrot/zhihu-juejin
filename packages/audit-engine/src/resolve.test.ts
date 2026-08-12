import { describe, expect, test } from "bun:test";
import { resolveIndependentAudits } from "./resolve";

describe("resolveIndependentAudits", () => {
  test("resolves when two independent auditors agree", () => {
    const result = resolveIndependentAudits([
      { auditorUserId: "auditor-1", verdict: "excellent", conflictOfInterest: false },
      { auditorUserId: "auditor-2", verdict: "excellent", conflictOfInterest: false },
    ]);

    expect(result).toEqual({
      state: "resolved",
      verdict: "excellent",
      agreeingAuditorIds: ["auditor-1", "auditor-2"],
    });
  });

  test("requests a third review when the first two disagree", () => {
    const result = resolveIndependentAudits([
      { auditorUserId: "auditor-1", verdict: "excellent", conflictOfInterest: false },
      { auditorUserId: "auditor-2", verdict: "low_value", conflictOfInterest: false },
    ]);

    expect(result).toEqual({ state: "third_review_required" });
  });

  test("requires adjudication when three auditors all disagree", () => {
    const result = resolveIndependentAudits([
      { auditorUserId: "auditor-1", verdict: "excellent", conflictOfInterest: false },
      { auditorUserId: "auditor-2", verdict: "qualified", conflictOfInterest: false },
      { auditorUserId: "auditor-3", verdict: "low_value", conflictOfInterest: false },
    ]);

    expect(result).toEqual({ state: "adjudication_required" });
  });

  test("excludes conflicted reviews from consensus", () => {
    const result = resolveIndependentAudits([
      { auditorUserId: "auditor-1", verdict: "excellent", conflictOfInterest: true },
      { auditorUserId: "auditor-2", verdict: "excellent", conflictOfInterest: false },
    ]);

    expect(result).toEqual({ state: "awaiting_reviews", requiredReviewCount: 1 });
  });
});
