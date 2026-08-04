import { z } from "zod";

export const lessonEditorSchema = z.object({
  order: z.number().int().min(1, "Thứ tự phải từ 1 trở lên."),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề bài học."),
  unitId: z.number().int().min(1, "Vui lòng chọn chương học."),
});

export type LessonEditorValues = z.infer<typeof lessonEditorSchema>;
