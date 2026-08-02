"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { FormActions } from "@/app/components/forms/FormActions";
import { FormField } from "@/app/components/forms/FormField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { User } from "@/app/features/users/types/user-management.types";

import {
  createUserEditorSchema,
  type UserEditorValues,
} from "./user-editor.schema";

type UserEditorFormProps = {
  error?: string;
  isSubmitting: boolean;
  onClose(): void;
  onSubmit(values: UserEditorValues): void | Promise<void>;
  user: User | null;
};

export function UserEditorForm({
  error,
  isSubmitting,
  onClose,
  onSubmit,
  user,
}: UserEditorFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
  } = useForm<UserEditorValues>({
    defaultValues: {
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "USER",
      username: user?.username ?? "",
    },
    resolver: zodResolver(createUserEditorSchema(Boolean(user))),
  });

  return (
    <Dialog onOpenChange={(open) => !open && !isSubmitting && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Chỉnh sửa người dùng" : "Tạo người dùng"}</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin đăng nhập và vai trò truy cập Admin.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.username?.message}
            htmlFor="user-username"
            label="Tên đăng nhập"
            required
          >
            <Input
              {...register("username")}
              aria-invalid={Boolean(errors.username)}
              autoComplete="username"
              id="user-username"
              placeholder="Tên đăng nhập"
            />
          </FormField>
          <FormField
            error={errors.email?.message}
            htmlFor="user-email"
            label="Địa chỉ email"
            required
          >
            <Input
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="user-email"
              placeholder="name@example.com"
              type="email"
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              description={user ? "Để trống nếu không đổi mật khẩu." : undefined}
              error={errors.password?.message}
              htmlFor="user-password"
              label="Mật khẩu"
              required={!user}
            >
              <Input
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                id="user-password"
                placeholder={user ? "Không thay đổi" : "Nhập mật khẩu"}
                type="password"
              />
            </FormField>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <FormField htmlFor="user-role" label="Vai trò" required>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full" id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Học viên</SelectItem>
                      <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
          <FormActions
            isSubmitDisabled={user ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={onClose}
            submitLabel={user ? "Lưu thay đổi" : "Tạo người dùng"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
