import { describe, expect, test } from "bun:test";
import { humanCalibrationCases } from "./calibration-cases";
import { planCreatorExpansion } from "./creator-expansion";

describe("creator expansion planning", () => {
  test("expands from strong human-reviewed content without trusting one article blindly", () => {
    expect(planCreatorExpansion(8, ["FIRST_HAND_PRACTICE", "ORIGINALITY"])).toEqual({
      priority: "high",
      targetSampleSize: 10,
      reasonCodes: ["HUMAN_REVIEW_TRIGGER", "FIRST_HAND_PRACTICE", "ORIGINALITY"],
    });
    expect(planCreatorExpansion(7).priority).toBe("standard");
    expect(planCreatorExpansion(6.5).priority).toBe("watch");
    expect(planCreatorExpansion(4).priority).toBe("none");
  });

  test("uses every scored calibration case as an author-expansion expectation", () => {
    for (const item of humanCalibrationCases) {
      if (item.humanScore === undefined) {
        continue;
      }
      const plan = planCreatorExpansion(item.humanScore, item.positiveSignals, item.failureReasons);
      expect(plan.priority).toBe(item.expectedCreatorExpansion);
    }
  });

  test("marks advertorial risk for creator-level pattern checking", () => {
    expect(planCreatorExpansion(7, [], ["ADVERTORIAL_RISK"]).reasonCodes).toContain(
      "CHECK_COMMERCIAL_PATTERN",
    );
  });

  test("records the expert-commentary human score as a calibration range", () => {
    const item = humanCalibrationCases.find(
      (calibration) => calibration.sourceContentId === "2070519089978667242",
    );
    expect(item?.humanScore).toBe(6.5);
    expect(item?.humanScoreRange).toEqual({ minimum: 6, maximum: 6.5 });
    expect(item?.positiveSignals).toContain("PROFESSIONAL_TACIT_EXPERIENCE");
  });

  test("records cross-domain human judgments for social and life content", () => {
    const scores = Object.fromEntries(
      humanCalibrationCases
        .filter((item) =>
          ["2002700235206595099", "2070507157703938737", "1920566492719747383"].includes(
            item.sourceContentId,
          ),
        )
        .map((item) => [item.sourceContentId, item.humanScore]),
    );
    expect(scores).toEqual({
      "2002700235206595099": 4,
      "2070507157703938737": 5.5,
      "1920566492719747383": 7.5,
    });
  });
});
