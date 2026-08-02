"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
  LessonChallengeViewModel,
} from "@/app/features/courses/types/course-management.types";

import {
  challengeEditorSchema,
  type ChallengeEditorValues,
} from "./challenge-editor.schema";

type ChallengeEditorFormProps = {
  challenge: LessonChallengeViewModel | null;
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  lessons: CourseLessonViewModel[];
  onOpenChange(open: boolean): void;
  onSubmit(values: ChallengeEditorValues): void | Promise<void>;
};

export function ChallengeEditorForm({
  challenge,
  error,
  isOpen,
  isSubmitting,
  lessons,
  onOpenChange,
  onSubmit,
}: ChallengeEditorFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<ChallengeEditorValues>({
    defaultValues: {
      direction: "EN_TO_VI",
      lessonId: lessons[0]?.id ?? 0,
      order: 1,
      question: "",
      type: "SELECT",
      vocabularyItemId: null,
    },
    resolver: zodResolver(challengeEditorSchema),
  });
  const challengeType = useWatch({ control, name: "type" });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      challenge
        ? {
            direction: challenge.direction ?? "EN_TO_VI",
            lessonId: challenge.lessonId,
            order: challenge.order,
            question: challenge.question,
            type: challenge.type,
            vocabularyItemId: challenge.vocabularyItemId,
          }
        : {
            direction: "EN_TO_VI",
            lessonId: lessons[0]?.id ?? 0,
            order: 1,
            question: "",
            type: "SELECT",
            vocabularyItemId: null,
          },
    );
  }, [challenge, isOpen, lessons, reset]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
      open={isOpen}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {challenge ? "Chỉnh sửa thử thách" : "Tạo thử thách"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình câu hỏi, loại tương tác và bài học sở hữu.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.question?.message}
            htmlFor="challenge-question"
            label="Câu hỏi"
            required
          >
            <Input
              {...register("question")}
              aria-invalid={Boolean(errors.question)}
              id="challenge-question"
              placeholder="Nhập nội dung câu hỏi"
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <FormField htmlFor="challenge-type" label="Loại thử thách" required>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full" id="challenge-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELECT">SELECT · Trắc nghiệm</SelectItem>
                      <SelectItem value="ASSIST">ASSIST · Hỗ trợ</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <FormField htmlFor="challenge-direction" label="Hướng ngôn ngữ">
                  <Select
                    disabled={challengeType !== "SELECT"}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full" id="challenge-direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN_TO_VI">Anh → Việt</SelectItem>
                      <SelectItem value="VI_TO_EN">Việt → Anh</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="lessonId"
              render={({ field }) => (
                <FormField
                  error={errors.lessonId?.message}
                  htmlFor="challenge-lesson"
                  label="Bài học"
                  required
                >
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? String(field.value) : undefined}
                  >
                    <SelectTrigger className="w-full" id="challenge-lesson">
                      <SelectValue placeholder="Chọn bài học" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={String(lesson.id)}>
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField
              error={errors.order?.message}
              htmlFor="challenge-order"
              label="Thứ tự"
              required
            >
              <Input
                {...register("order", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.order)}
                id="challenge-order"
                min={1}
                type="number"
              />
            </FormField>
          </div>
          <FormField
            description="Để trống nếu thử thách chưa liên kết trực tiếp với một mục từ vựng."
            error={errors.vocabularyItemId?.message}
            htmlFor="challenge-vocabulary"
            label="Vocabulary Item ID"
          >
            <Input
              {...register("vocabularyItemId", {
                setValueAs: (value) => (value === "" ? null : Number(value)),
              })}
              aria-invalid={Boolean(errors.vocabularyItemId)}
              className="max-w-48 tabular-nums"
              id="challenge-vocabulary"
              min={1}
              placeholder="Tùy chọn"
              type="number"
            />
          </FormField>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <FormActions
            isSubmitDisabled={challenge ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={challenge ? "Lưu thay đổi" : "Tạo thử thách"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
