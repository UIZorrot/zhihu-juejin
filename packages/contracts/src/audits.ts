import { type Static, Type } from "@sinclair/typebox";

export const AuditVerdictSchema = Type.Union([
  Type.Literal("excellent"),
  Type.Literal("qualified"),
  Type.Literal("low_value"),
  Type.Literal("spam"),
]);

export type AuditVerdict = Static<typeof AuditVerdictSchema>;

const ScoreSchema = Type.Integer({ minimum: 0, maximum: 100 });

export const AuditSubmissionSchema = Type.Object({
  verdict: AuditVerdictSchema,
  depth: ScoreSchema,
  originality: ScoreSchema,
  evidenceQuality: ScoreSchema,
  decisionValue: ScoreSchema,
  marketingRisk: ScoreSchema,
  informationGain: ScoreSchema,
  newInformation: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  supportingEvidence: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
    maxItems: 20,
  }),
  concerns: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  verificationNeeded: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
    maxItems: 20,
  }),
  confidence: ScoreSchema,
  conflictOfInterest: Type.Boolean(),
});

export type AuditSubmission = Static<typeof AuditSubmissionSchema>;
