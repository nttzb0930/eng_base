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

const evidenceRangeSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    text: z.string().min(1).max(2_200),
  })
  .strict()
  .refine(({ start, end }) => end > start, {
    message: "Evidence end must be greater than start",
  });

const feedbackStatusSchema = z.enum(["PASS", "WARN", "FAIL"]);

export const writingPartTwoProviderResultSchema = z
  .object({
    score: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    scoreLabel: z.string().trim().min(1).max(100),
    taskCompletion: z
      .object({
        status: feedbackStatusSchema,
        completedCount: z.number().int().nonnegative().max(20),
        totalCount: z.number().int().nonnegative().max(20),
        requirements: z
          .array(
            z
              .object({
                requirementId: z.string().trim().min(1).max(100),
                status: z.enum(["MET", "PARTIAL", "MISSING"]),
                comment: z.string().trim().min(1).max(1_000),
                evidence: z.array(evidenceRangeSchema).max(10),
                suggestedFix: z.string().trim().min(1).max(1_000).nullable(),
              })
              .strict()
          )
          .max(20),
      })
      .strict(),
    sentenceVariety: z
      .object({
        status: feedbackStatusSchema,
        detected: z
          .array(
            z
              .object({
                kind: z.enum(["SIMPLE", "COMPOUND", "COMPLEX"]),
                evidence: evidenceRangeSchema,
              })
              .strict()
          )
          .max(20),
        feedback: z.string().trim().min(1).max(1_500),
      })
      .strict(),
    tone: z
      .object({
        status: feedbackStatusSchema,
        feedback: z.string().trim().min(1).max(1_500),
        suggestedOpening: z.string().trim().min(1).max(500).nullable(),
      })
      .strict(),
    grammar: z
      .object({
        status: feedbackStatusSchema,
        errors: z
          .array(
            z
              .object({
                severity: z.enum(["SERIOUS", "MINOR"]),
                evidence: evidenceRangeSchema,
                correction: z.string().trim().min(1).max(500),
                explanation: z.string().trim().min(1).max(1_000),
              })
              .strict()
          )
          .max(50),
        feedback: z.string().trim().min(1).max(1_500),
      })
      .strict(),
    paraphrase: z
      .object({
        status: feedbackStatusSchema,
        copiedRanges: z.array(evidenceRangeSchema).max(30),
        feedback: z.string().trim().min(1).max(1_500),
      })
      .strict(),
    overallFeedback: z.string().trim().min(1).max(2_000),
    strengths: z.array(z.string().trim().min(1).max(500)).max(20),
    improvements: z.array(z.string().trim().min(1).max(500)).max(20),
    improvedEmail: z
      .object({
        text: z.string().trim().min(1).max(2_200),
        wordCount: z.number().int().nonnegative().max(300),
        differences: z.array(z.string().trim().min(1).max(500)).max(30),
        requirementCoverage: z
          .array(
            z
              .object({
                requirementId: z.string().trim().min(1).max(100),
                evidence: z.array(evidenceRangeSchema).max(10),
              })
              .strict()
          )
          .max(20),
      })
      .strict(),
  })
  .strict();
