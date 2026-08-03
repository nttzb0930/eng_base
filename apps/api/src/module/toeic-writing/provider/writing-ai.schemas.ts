import { z } from "zod";

const gradeCheckSchema = z
  .object({
    status: z.enum(["PASS", "WARN", "FAIL"]),
    label: z.string().trim().min(1).max(120),
    feedback: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const writingPictureContextSchema = z
  .object({
    schemaVersion: z.literal(1),
    sceneSummary: z.string().trim().min(1).max(1_000),
    visibleEntities: z.array(z.string().trim().min(1).max(120)).max(50),
    visibleActions: z.array(z.string().trim().min(1).max(200)).max(30),
    relationships: z.array(z.string().trim().min(1).max(300)).max(30),
    requiredWordGrounding: z
      .array(
        z
          .object({
            word: z.string().trim().min(1).max(100),
            supported: z.boolean(),
            evidence: z.string().trim().max(300),
          })
          .strict()
      )
      .max(10),
  })
  .strict();

export const writingPartOneProviderResultSchema = z
  .object({
    score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    scoreLabel: z.string().trim().min(1).max(100),
    checks: z
      .object({
        grammar: gradeCheckSchema,
        keywords: gradeCheckSchema,
        relevance: gradeCheckSchema,
      })
      .strict(),
    overallFeedback: z.string().trim().min(1).max(2_000),
    suggestion: z
      .object({
        correctedSentence: z.string().trim().min(1).max(500),
        annotated: z
          .array(
            z
              .object({
                text: z.string().min(1).max(200),
                status: z.enum(["KEPT", "CORRECTED", "ADDED", "REMOVED"]),
              })
              .strict()
          )
          .max(100),
        alternativeSentence: z.string().trim().min(1).max(500),
        explanation: z.string().trim().min(1).max(1_500),
      })
      .strict(),
  })
  .strict();
