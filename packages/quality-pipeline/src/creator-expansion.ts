export type CreatorExpansionPriority = "high" | "standard" | "watch" | "none";

export interface CreatorExpansionPlan {
  priority: CreatorExpansionPriority;
  targetSampleSize: number;
  reasonCodes: string[];
}

export function planCreatorExpansion(
  humanScore: number,
  positiveSignals: readonly string[] = [],
  failureReasons: readonly string[] = [],
): CreatorExpansionPlan {
  if (!Number.isFinite(humanScore) || humanScore < 0 || humanScore > 10) {
    throw new RangeError("humanScore must be between 0 and 10");
  }

  const reasonCodes = ["HUMAN_REVIEW_TRIGGER"];
  if (positiveSignals.includes("FIRST_HAND_PRACTICE")) {
    reasonCodes.push("FIRST_HAND_PRACTICE");
  }
  if (positiveSignals.includes("ORIGINALITY")) {
    reasonCodes.push("ORIGINALITY");
  }
  if (failureReasons.some((reason) => reason.includes("ADVERTORIAL"))) {
    reasonCodes.push("CHECK_COMMERCIAL_PATTERN");
  }

  if (humanScore >= 8) {
    return { priority: "high", targetSampleSize: 10, reasonCodes };
  }
  if (humanScore >= 7) {
    return { priority: "standard", targetSampleSize: 6, reasonCodes };
  }
  if (humanScore >= 6) {
    return { priority: "watch", targetSampleSize: 3, reasonCodes };
  }
  return { priority: "none", targetSampleSize: 0, reasonCodes: [] };
}
