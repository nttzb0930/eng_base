import { z } from "zod";

import { writingPictureContextSchema } from "../../src/module/toeic-writing/provider/writing-ai.schemas";

export const pictureContextCandidateSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.string().trim().min(1).max(100),
    sourceTaskId: z.string().trim().min(1).max(200),
    sourceVersion: z.string().regex(/^[a-f0-9]{64}$/u),
    contentVersion: z.string().regex(/^[a-f0-9]{64}$/u),
    imageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    model: z.string().trim().min(1).max(100),
    promptVersion: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]{1,64}$/u),
    context: writingPictureContextSchema,
  })
  .strict();

export type PictureContextCandidate = z.infer<
  typeof pictureContextCandidateSchema
>;
