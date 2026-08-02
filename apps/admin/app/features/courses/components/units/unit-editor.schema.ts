import { z } from "zod";

export const unitEditorSchema = z.object({
  cefrLevel: z.enum(["none", "A1", "A2", "B1", "B2"]),
  courseId: z.number().int().min(1, "Vui lòng chọn khóa học."),
  description: z.string().trim().min(1, "Vui lòng nhập mô tả."),
  order: z.number().int().min(1, "Thứ tự phải từ 1 trở lên."),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề chương."),
});

export type UnitEditorValues = z.infer<typeof unitEditorSchema>;
