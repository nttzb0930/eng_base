import { z } from "zod";

export const challengeOptionEditorSchema = z.object({
  audioSrc: z.string().trim(),
  challengeId: z.number().int().min(1, "Vui lòng chọn câu hỏi."),
  correct: z.boolean(),
  imageSrc: z.string().trim(),
  text: z.string().trim().min(1, "Vui lòng nhập nội dung đáp án."),
});

export type ChallengeOptionEditorValues = z.infer<
  typeof challengeOptionEditorSchema
>;
