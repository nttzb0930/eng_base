"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CEFR_LEVELS } from "@repo/shared";
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
  CourseUnitViewModel,
  CourseViewModel,
} from "@/app/features/courses/types/course-management.types";

import {
  unitEditorSchema,
  type UnitEditorValues,
} from "./unit-editor.schema";

type UnitEditorFormProps = {
  courses: CourseViewModel[];
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(values: UnitEditorValues): void | Promise<void>;
  unit: CourseUnitViewModel | null;
};

export function UnitEditorForm({
  courses,
  error,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  unit,
}: UnitEditorFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<UnitEditorValues>({
    defaultValues: {
      cefrLevel: "none",
      courseId: courses[0]?.id ?? 0,
      description: "",
      order: 1,
      title: "",
    },
    resolver: zodResolver(unitEditorSchema),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      unit
        ? {
            cefrLevel: unit.cefrLevel ?? "none",
            courseId: unit.courseId,
            description: unit.description,
            order: unit.order,
            title: unit.title,
          }
        : {
            cefrLevel: "none",
            courseId: courses[0]?.id ?? 0,
            description: "",
            order: 1,
            title: "",
          },
    );
  }, [courses, isOpen, reset, unit]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{unit ? "Chỉnh sửa chương" : "Tạo chương"}</DialogTitle>
          <DialogDescription>
            Chương thuộc một khóa học và có thứ tự hiển thị riêng.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.title?.message}
            htmlFor="unit-title"
            label="Tiêu đề"
            required
          >
            <Input
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              id="unit-title"
              placeholder="Unit 1: Cơ bản"
            />
          </FormField>
          <FormField
            error={errors.description?.message}
            htmlFor="unit-description"
            label="Mô tả"
            required
          >
            <Input
              {...register("description")}
              aria-invalid={Boolean(errors.description)}
              id="unit-description"
              placeholder="Mô tả ngắn về chương"
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <FormField
                  error={errors.courseId?.message}
                  htmlFor="unit-course"
                  label="Khóa học"
                  required
                >
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? String(field.value) : undefined}
                  >
                    <SelectTrigger
                      aria-invalid={Boolean(errors.courseId)}
                      className="w-full"
                      id="unit-course"
                    >
                      <SelectValue placeholder="Chọn khóa học" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="cefrLevel"
              render={({ field }) => (
                <FormField htmlFor="unit-cefr" label="Trình độ CEFR">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full" id="unit-cefr">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không gán</SelectItem>
                      {CEFR_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>
          <FormField
            error={errors.order?.message}
            htmlFor="unit-order"
            label="Thứ tự"
            required
          >
            <Input
              {...register("order", { valueAsNumber: true })}
              aria-invalid={Boolean(errors.order)}
              className="max-w-32 tabular-nums"
              id="unit-order"
              min={1}
              type="number"
            />
          </FormField>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <FormActions
            isSubmitDisabled={unit ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={unit ? "Lưu thay đổi" : "Tạo chương"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
