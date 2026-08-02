"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import type {
  CourseLessonViewModel,
  CourseUnitViewModel,
} from "@/app/features/courses/types/course-management.types";

import {
  lessonEditorSchema,
  type LessonEditorValues,
} from "./lesson-editor.schema";

type LessonEditorFormProps = {
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  lesson: CourseLessonViewModel | null;
  onOpenChange(open: boolean): void;
  onSubmit(values: LessonEditorValues): void | Promise<void>;
  units: CourseUnitViewModel[];
};

export function LessonEditorForm({
  error,
  isOpen,
  isSubmitting,
  lesson,
  onOpenChange,
  onSubmit,
  units,
}: LessonEditorFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<LessonEditorValues>({
    defaultValues: { order: 1, title: "", unitId: units[0]?.id ?? 0 },
    resolver: zodResolver(lessonEditorSchema),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      lesson
        ? { order: lesson.order, title: lesson.title, unitId: lesson.unitId }
        : { order: 1, title: "", unitId: units[0]?.id ?? 0 },
    );
  }, [isOpen, lesson, reset, units]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lesson ? "Chỉnh sửa bài học" : "Tạo bài học"}</DialogTitle>
          <DialogDescription>
            Gán bài học vào chương và xác định thứ tự hiển thị.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.title?.message}
            htmlFor="lesson-title"
            label="Tiêu đề bài học"
            required
          >
            <Input
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              id="lesson-title"
              placeholder="Nhập tiêu đề bài học"
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="unitId"
              render={({ field }) => (
                <FormField
                  error={errors.unitId?.message}
                  htmlFor="lesson-unit"
                  label="Chương học"
                  required
                >
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? String(field.value) : undefined}
                  >
                    <SelectTrigger className="w-full" id="lesson-unit">
                      <SelectValue placeholder="Chọn chương" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={String(unit.id)}>
                          {unit.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField
              error={errors.order?.message}
              htmlFor="lesson-order"
              label="Thứ tự"
              required
            >
              <Input
                {...register("order", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.order)}
                className="tabular-nums"
                id="lesson-order"
                min={1}
                type="number"
              />
            </FormField>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <FormActions
            isSubmitDisabled={lesson ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={lesson ? "Lưu thay đổi" : "Tạo bài học"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
