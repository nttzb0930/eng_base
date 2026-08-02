"use client";

import type {
  AdminReadingPassage,
  CreateReadingPassagePayload,
  ReadingQuestionInput,
  ReadingTopicOption,
} from "@repo/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FormActions } from "@/app/components/forms/FormActions";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

import { ReadingPassageFields } from "./ReadingPassageFields";
import { ReadingQuestionEditor } from "./ReadingQuestionEditor";
import { readingPassageSchema } from "./reading-passage.schema";

const emptyQuestion = (): ReadingQuestionInput => ({
  options: [
    { correct: true, order: 1, text: "" },
    { correct: false, order: 2, text: "" },
  ],
  order: 1,
  prompt: "",
});

const emptyForm = (): CreateReadingPassagePayload => ({
  body: "",
  cefrLevel: "A1",
  estimatedMinutes: 3,
  questions: [emptyQuestion()],
  slug: "",
  title: "",
  topicId: null,
});

function toForm(passage: AdminReadingPassage): CreateReadingPassagePayload {
  return {
    body: passage.body,
    cefrLevel: passage.cefrLevel,
    estimatedMinutes: passage.estimatedMinutes,
    questions: passage.questions.map((question) => ({
      options: question.options.map((option) => ({
        correct: option.correct,
        order: option.order,
        text: option.text,
      })),
      order: question.order,
      prompt: question.prompt,
    })),
    slug: passage.slug,
    title: passage.title,
    topicId: passage.topicId,
  };
}

function normalizeQuestions(
  questions: ReadingQuestionInput[],
): ReadingQuestionInput[] {
  return questions.map((question, questionIndex) => ({
    options: question.options.map((option, optionIndex) => ({
      correct: option.correct,
      order: optionIndex + 1,
      text: option.text.trim(),
    })),
    order: questionIndex + 1,
    prompt: question.prompt.trim(),
  }));
}

type ReadingPassageEditorDialogProps = {
  isOpen: boolean;
  isSaving: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(payload: CreateReadingPassagePayload): void | Promise<void>;
  passage: AdminReadingPassage | null;
  topics: ReadingTopicOption[];
};

export function ReadingPassageEditorDialog({
  isOpen,
  isSaving,
  onOpenChange,
  onSubmit,
  passage,
  topics,
}: ReadingPassageEditorDialogProps) {
  const [form, setForm] = useState<CreateReadingPassagePayload>(() =>
    passage ? toForm(passage) : emptyForm(),
  );
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = readingPassageSchema.safeParse({
      ...form,
      questions: normalizeQuestions(form.questions),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Vui lòng kiểm tra nội dung.");
      return;
    }
    setError(undefined);
    try {
      await onSubmit(result.data);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu passage.",
      );
    }
  };

  const updateQuestion = (index: number, question: ReadingQuestionInput) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((item, itemIndex) =>
        itemIndex === index ? question : item,
      ),
    }));
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSaving) onOpenChange(open);
      }}
      open={isOpen}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>{passage ? "Chỉnh sửa passage" : "Tạo passage A1"}</DialogTitle>
          <DialogDescription>
            Mỗi câu hỏi cần ít nhất hai đáp án và đúng một đáp án chính xác.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-7 px-6 pb-6" onSubmit={submit}>
          <ReadingPassageFields
            onChange={setForm}
            passage={passage}
            topics={topics}
            value={form}
          />
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">Câu hỏi</h3>
                <p className="text-xs text-muted-foreground">
                  Thứ tự được lưu theo vị trí hiển thị.
                </p>
              </div>
              <Button
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    questions: [
                      ...current.questions,
                      { ...emptyQuestion(), order: current.questions.length + 1 },
                    ],
                  }))
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus aria-hidden="true" /> Thêm câu hỏi
              </Button>
            </div>
            {form.questions.map((question, questionIndex) => (
              <ReadingQuestionEditor
                key={questionIndex}
                onChange={(nextQuestion) =>
                  updateQuestion(questionIndex, nextQuestion)
                }
                onRemove={() => {
                  if (form.questions.length === 1) {
                    toast.error("Passage cần ít nhất một câu hỏi.");
                    return;
                  }
                  setForm((current) => ({
                    ...current,
                    questions: current.questions.filter(
                      (_, index) => index !== questionIndex,
                    ),
                  }));
                }}
                question={question}
                questionIndex={questionIndex}
              />
            ))}
          </section>
          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
          <FormActions
            isSubmitting={isSaving}
            onCancel={() => onOpenChange(false)}
            submitLabel={passage ? "Lưu thay đổi" : "Tạo passage"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
