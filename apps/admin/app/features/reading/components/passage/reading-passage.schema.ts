import { READING_CEFR_LEVELS } from "@repo/shared";
import { z } from "zod";

const optionSchema = z.object({
  correct: z.boolean(),
  order: z.number().int().min(1),
  text: z.string().trim().min(1, "Mỗi đáp án cần có nội dung."),
});

const questionSchema = z
  .object({
    options: z.array(optionSchema).min(2, "Mỗi câu hỏi cần ít nhất hai đáp án."),
    order: z.number().int().min(1),
    prompt: z.string().trim().min(1, "Mỗi câu hỏi cần có nội dung."),
  })
  .refine(
    (question) => question.options.filter((option) => option.correct).length === 1,
    "Mỗi câu hỏi cần đúng một đáp án chính xác.",
  );

export const readingPassageSchema = z.object({
  body: z.string().trim().min(1, "Vui lòng nhập nội dung passage."),
  cefrLevel: z.enum(READING_CEFR_LEVELS),
  estimatedMinutes: z.number().int().min(1, "Thời gian đọc phải từ 1 phút."),
  questions: z.array(questionSchema).min(1, "Passage cần ít nhất một câu hỏi."),
  slug: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập slug.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Slug chỉ dùng chữ thường, số và dấu gạch ngang."),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề."),
  topicId: z.number().int().positive().nullable(),
});
