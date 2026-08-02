import { z } from "zod";

export const courseEditorSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã khóa học.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
      "Chỉ dùng chữ thường, số và dấu gạch ngang.",
    ),
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề khóa học."),
  imageSrc: z.string().trim().min(1, "Vui lòng nhập đường dẫn ảnh."),
});

export type CourseEditorValues = z.infer<typeof courseEditorSchema>;
