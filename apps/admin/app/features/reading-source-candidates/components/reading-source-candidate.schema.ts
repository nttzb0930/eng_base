import { z } from "zod";

import { readingPassageSchema } from "@/app/features/reading/components/passage/reading-passage.schema";

export const readingSourceCandidateSchema = readingPassageSchema.superRefine(
  (value, context) => {
    if (value.topicId === null) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng gán topic trước khi chuyển đổi.",
        path: ["topicId"],
      });
    }
  },
);

export type ReadingSourceCandidateFormValues = z.infer<
  typeof readingSourceCandidateSchema
>;
