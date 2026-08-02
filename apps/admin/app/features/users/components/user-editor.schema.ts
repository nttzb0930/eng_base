import { z } from "zod";

export const createUserEditorSchema = (isEditing: boolean) =>
  z
    .object({
      email: z.string().trim().email("Email không hợp lệ."),
      password: z.string(),
      role: z.enum(["ADMIN", "USER"]),
      username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập."),
    })
    .superRefine((value, context) => {
      if (!isEditing && !value.password.trim()) {
        context.addIssue({
          code: "custom",
          message: "Vui lòng nhập mật khẩu khi tạo người dùng.",
          path: ["password"],
        });
      }
    });

export type UserEditorValues = z.infer<
  ReturnType<typeof createUserEditorSchema>
>;
