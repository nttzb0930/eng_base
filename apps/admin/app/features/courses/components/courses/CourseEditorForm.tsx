"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
import type { CourseViewModel } from "@/app/features/courses/types/course-management.types";

import {
  courseEditorSchema,
  type CourseEditorValues,
} from "./course-editor.schema";

type CourseEditorFormProps = {
  course: CourseViewModel | null;
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(values: CourseEditorValues): void | Promise<void>;
};

const emptyValues: CourseEditorValues = {
  code: "",
  imageSrc: "",
  title: "",
};

export function CourseEditorForm({
  course,
  error,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CourseEditorFormProps) {
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<CourseEditorValues>({
    defaultValues: emptyValues,
    resolver: zodResolver(courseEditorSchema),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      course
        ? { code: course.code, imageSrc: course.imageSrc, title: course.title }
        : emptyValues,
    );
  }, [course, isOpen, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) onOpenChange(open);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {course ? "Chỉnh sửa khóa học" : "Tạo khóa học"}
          </DialogTitle>
          <DialogDescription>
            {course
              ? "Cập nhật thông tin hiển thị. Mã khóa học không thể thay đổi."
              : "Thêm một khóa học mới vào danh mục quản lý."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.code?.message}
            htmlFor="course-code"
            label="Mã khóa học"
            required
          >
            <Input
              {...register("code")}
              aria-describedby={errors.code ? "course-code-error" : undefined}
              aria-invalid={Boolean(errors.code)}
              autoComplete="off"
              className="font-mono"
              disabled={Boolean(course)}
              id="course-code"
              placeholder="english-vocabulary"
            />
          </FormField>

          <FormField
            error={errors.title?.message}
            htmlFor="course-title"
            label="Tiêu đề"
            required
          >
            <Input
              {...register("title")}
              aria-describedby={errors.title ? "course-title-error" : undefined}
              aria-invalid={Boolean(errors.title)}
              id="course-title"
              placeholder="Tên khóa học hiển thị"
            />
          </FormField>

          <FormField
            description="Dùng đường dẫn asset công khai, ví dụ /es.svg."
            error={errors.imageSrc?.message}
            htmlFor="course-image"
            label="Ảnh biểu tượng"
            required
          >
            <Input
              {...register("imageSrc")}
              aria-describedby={
                errors.imageSrc
                  ? "course-image-description course-image-error"
                  : "course-image-description"
              }
              aria-invalid={Boolean(errors.imageSrc)}
              id="course-image"
              placeholder="/es.svg"
            />
          </FormField>

          {error ? (
            <p className="text-sm font-normal text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <FormActions
            isSubmitDisabled={course ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={course ? "Lưu thay đổi" : "Tạo khóa học"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
