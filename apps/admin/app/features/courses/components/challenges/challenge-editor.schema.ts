import { z } from "zod";

export const challengeEditorSchema = z.object({
  direction: z.enum(["EN_TO_VI", "VI_TO_EN"]),
  lessonId: z.number().int().min(1, "Vui lòng chọn bài học."),
  order: z.number().int().min(1, "Thứ tự phải từ 1 trở lên."),
  question: z.string().trim().min(1, "Vui lòng nhập câu hỏi."),
  type: z.enum(["SELECT", "ASSIST"]),
  vocabularyItemId: z
    .number()
    .int()
    .min(1, "Vocabulary Item ID phải lớn hơn 0.")
    .nullable(),
});

export type ChallengeEditorValues = z.infer<typeof challengeEditorSchema>;
