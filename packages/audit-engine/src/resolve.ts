import type { AuditVerdict } from "@zhihu-juejin/contracts";

export interface IndependentAudit {
  auditorUserId: string;
  verdict: AuditVerdict;
  conflictOfInterest: boolean;
}

export type AuditResolution =
  | { state: "awaiting_reviews"; requiredReviewCount: number }
  | { state: "third_review_required" }
  | { state: "adjudication_required" }
  | { state: "resolved"; verdict: AuditVerdict; agreeingAuditorIds: string[] };

export function resolveIndependentAudits(audits: IndependentAudit[]): AuditResolution {
  const validAudits = audits.filter((audit) => !audit.conflictOfInterest);
  const uniqueAuditorIds = new Set(validAudits.map((audit) => audit.auditorUserId));
  if (uniqueAuditorIds.size !== validAudits.length) {
    throw new Error("Each independent audit must come from a different auditor");
  }

  if (validAudits.length < 2) {
    return { state: "awaiting_reviews", requiredReviewCount: 2 - validAudits.length };
  }

  const verdictGroups = new Map<AuditVerdict, IndependentAudit[]>();
  for (const audit of validAudits) {
    const group = verdictGroups.get(audit.verdict) ?? [];
    group.push(audit);
    verdictGroups.set(audit.verdict, group);
  }
  const majority = [...verdictGroups.entries()].find(([, group]) => group.length >= 2);
  if (majority) {
    return {
      state: "resolved",
      verdict: majority[0],
      agreeingAuditorIds: majority[1].map((audit) => audit.auditorUserId),
    };
  }

  if (validAudits.length === 2) {
    return { state: "third_review_required" };
  }

  return { state: "adjudication_required" };
}
