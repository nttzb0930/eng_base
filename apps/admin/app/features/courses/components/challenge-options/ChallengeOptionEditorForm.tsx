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
import { Switch } from "@/app/components/ui/switch";
import type {
  LessonChallengeOptionViewModel,
  LessonChallengeViewModel,
} from "@/app/features/courses/types/course-management.types";

import {
  challengeOptionEditorSchema,
  type ChallengeOptionEditorValues,
} from "./challenge-option-editor.schema";

type ChallengeOptionEditorFormProps = {
  challenges: LessonChallengeViewModel[];
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(values: ChallengeOptionEditorValues): void | Promise<void>;
  option: LessonChallengeOptionViewModel | null;
};

export function ChallengeOptionEditorForm({
  challenges,
  error,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  option,
}: ChallengeOptionEditorFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<ChallengeOptionEditorValues>({
    defaultValues: {
      audioSrc: "",
      challengeId: challenges[0]?.id ?? 0,
      correct: false,
      imageSrc: "",
      text: "",
    },
    resolver: zodResolver(challengeOptionEditorSchema),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      option
        ? {
            audioSrc: option.audioSrc ?? "",
            challengeId: option.challengeId,
            correct: option.correct,
            imageSrc: option.imageSrc ?? "",
            text: option.text,
          }
        : {
            audioSrc: "",
            challengeId: challenges[0]?.id ?? 0,
            correct: false,
            imageSrc: "",
            text: "",
          },
    );
  }, [challenges, isOpen, option, reset]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
      open={isOpen}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{option ? "Chỉnh sửa đáp án" : "Tạo đáp án"}</DialogTitle>
          <DialogDescription>
            Gắn đáp án với câu hỏi và đánh dấu chính xác rõ ràng.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FormField
            error={errors.text?.message}
            htmlFor="option-text"
            label="Nội dung đáp án"
            required
          >
            <Input
              {...register("text")}
              aria-invalid={Boolean(errors.text)}
              id="option-text"
              placeholder="Nhập nội dung đáp án"
            />
          </FormField>
          <Controller
            control={control}
            name="challengeId"
            render={({ field }) => (
              <FormField
                error={errors.challengeId?.message}
                htmlFor="option-challenge"
                label="Câu hỏi thử thách"
                required
              >
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value ? String(field.value) : undefined}
                >
                  <SelectTrigger className="w-full" id="option-challenge">
                    <SelectValue placeholder="Chọn câu hỏi" />
                  </SelectTrigger>
                  <SelectContent>
                    {challenges.map((challenge) => (
                      <SelectItem key={challenge.id} value={String(challenge.id)}>
                        {challenge.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />
          <Controller
            control={control}
            name="correct"
            render={({ field }) => (
              <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="option-correct">
                    Đây là đáp án đúng
                  </label>
                  <p className="text-sm text-muted-foreground" id="option-correct-description">
                    Trạng thái này được hiển thị bằng cả biểu tượng và văn bản.
                  </p>
                </div>
                <Switch
                  aria-describedby="option-correct-description"
                  checked={field.value}
                  id="option-correct"
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField htmlFor="option-image" label="Ảnh (tùy chọn)">
              <Input {...register("imageSrc")} id="option-image" placeholder="/apple.svg" />
            </FormField>
            <FormField htmlFor="option-audio" label="Audio (tùy chọn)">
              <Input {...register("audioSrc")} id="option-audio" placeholder="/audio/apple.mp3" />
            </FormField>
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <FormActions
            isSubmitDisabled={option ? !isDirty : false}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel={option ? "Lưu thay đổi" : "Tạo đáp án"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
