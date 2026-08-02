"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  READING_CEFR_LEVELS,
  type AdminReadingSourceCandidateDetail,
  type ConvertReadingSourceCandidatePayload,
  type ReadingTopicOption,
} from "@repo/shared";
import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/app/components/forms/FormField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

import {
  readingSourceCandidateSchema,
  type ReadingSourceCandidateFormValues,
} from "./reading-source-candidate.schema";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

function initialForm(
  candidate: AdminReadingSourceCandidateDetail,
): ReadingSourceCandidateFormValues {
  return {
    body: candidate.plainTextDraft,
    cefrLevel: "A1",
    estimatedMinutes: Math.max(
      1,
      Math.ceil(candidate.plainTextDraft.split(/\s+/u).length / 180),
    ),
    questions: candidate.questions.map((question, index) => ({
      options: question.choices.map((choice, optionIndex) => ({
        correct: choice.label === question.correct,
        order: optionIndex + 1,
        text: choice.text,
      })),
      order: index + 1,
      prompt: question.question,
    })),
    slug: slugify(candidate.sourceTitle),
    title: candidate.sourceTitle,
    topicId: null,
  };
}

type ReadingSourceCandidateEditorProps = {
  candidate: AdminReadingSourceCandidateDetail;
  converting: boolean;
  onClose(): void;
  onConvert(payload: ConvertReadingSourceCandidatePayload): Promise<unknown>;
  onReject(reason: string): Promise<unknown>;
  rejecting: boolean;
  topics: ReadingTopicOption[];
};

export function ReadingSourceCandidateEditor({
  candidate,
  converting,
  onClose,
  onConvert,
  onReject,
  rejecting,
  topics,
}: ReadingSourceCandidateEditorProps) {
  const [reason, setReason] = useState("");
  const [confirmConvert, setConfirmConvert] = useState(false);
  const form = useForm<ReadingSourceCandidateFormValues>({
    defaultValues: initialForm(candidate),
    resolver: zodResolver(readingSourceCandidateSchema),
  });
  const cefrLevel = useWatch({ control: form.control, name: "cefrLevel" });
  const questions = useWatch({ control: form.control, name: "questions" });
  const topicId = useWatch({ control: form.control, name: "topicId" });
  const errors = form.formState.errors;
  const pending = candidate.status === "PENDING";

  const submitConvert = form.handleSubmit(async (payload) => {
    try {
      await onConvert(payload);
      toast.success("Đã tạo Reading draft.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể chuyển đổi candidate.",
      );
    }
  });

  const requestConvert = async () => {
    if (await form.trigger()) {
      setConfirmConvert(true);
    }
  };

  const rejectCandidate = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      await onReject(reason.trim());
      toast.success("Đã từ chối candidate.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể từ chối candidate.",
      );
    }
  };

  const updateCorrectOption = (questionIndex: number, selected: number) => {
    const questions = form.getValues("questions");
    form.setValue(
      "questions",
      questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, optionIndex) => ({
                ...option,
                correct: optionIndex === selected,
              })),
            }
          : question,
      ),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Nguồn", candidate.source],
          ["Level", candidate.sourceLevel],
          ["Câu hỏi", candidate.questionCount],
          ["Trạng thái", candidate.status],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Source ID</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {candidate.sourceId}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Checksum</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {candidate.contentSha256}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium">HTML nguồn đã escape</p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-xs leading-5">
            {candidate.sourceHtml}
          </pre>
        </div>
        <FormField
          error={errors.body?.message}
          htmlFor="candidate-body"
          label="Bản nháp"
          required
        >
          <Textarea
            aria-describedby={errors.body ? "candidate-body-error" : undefined}
            aria-invalid={Boolean(errors.body)}
            className="min-h-72 leading-6"
            disabled={!pending}
            id="candidate-body"
            {...form.register("body")}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          error={errors.slug?.message}
          htmlFor="candidate-slug"
          label="Slug"
          required
        >
          <Input
            aria-describedby={errors.slug ? "candidate-slug-error" : undefined}
            aria-invalid={Boolean(errors.slug)}
            disabled={!pending}
            id="candidate-slug"
            {...form.register("slug")}
          />
        </FormField>
        <FormField
          error={errors.title?.message}
          htmlFor="candidate-title"
          label="Tiêu đề"
          required
        >
          <Input
            aria-describedby={errors.title ? "candidate-title-error" : undefined}
            aria-invalid={Boolean(errors.title)}
            disabled={!pending}
            id="candidate-title"
            {...form.register("title")}
          />
        </FormField>
        <FormField
          error={errors.estimatedMinutes?.message}
          htmlFor="candidate-minutes"
          label="Phút đọc"
          required
        >
          <Input
            aria-describedby={
              errors.estimatedMinutes ? "candidate-minutes-error" : undefined
            }
            aria-invalid={Boolean(errors.estimatedMinutes)}
            disabled={!pending}
            id="candidate-minutes"
            min={1}
            type="number"
            {...form.register("estimatedMinutes", { valueAsNumber: true })}
          />
        </FormField>
        <FormField htmlFor="candidate-cefr" label="CEFR" required>
          <Select
            disabled={!pending}
            onValueChange={(cefrLevel) =>
              form.setValue(
                "cefrLevel",
                cefrLevel as ReadingSourceCandidateFormValues["cefrLevel"],
                { shouldDirty: true, shouldValidate: true },
              )
            }
            value={cefrLevel}
          >
            <SelectTrigger className="w-full" id="candidate-cefr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_CEFR_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="md:col-span-2">
          <FormField
            error={errors.topicId?.message}
            htmlFor="candidate-topic"
            label="Topic"
            required
          >
            <Select
              disabled={!pending}
              onValueChange={(topicId) =>
                form.setValue(
                  "topicId",
                  topicId === "none" ? null : Number(topicId),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
              value={topicId === null ? "none" : String(topicId)}
            >
              <SelectTrigger
                aria-describedby={
                  errors.topicId ? "candidate-topic-error" : undefined
                }
                aria-invalid={Boolean(errors.topicId)}
                className="w-full"
                id="candidate-topic"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không gán topic</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={String(topic.id)}>
                    {topic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Câu hỏi và đáp án</h3>
        {questions.map((question, questionIndex) => {
          const questionError = errors.questions?.[questionIndex];
          return (
            <div className="space-y-3 rounded-lg border p-4" key={questionIndex}>
              <Input
                aria-describedby={
                  questionError?.prompt
                    ? `candidate-question-${questionIndex}-error`
                    : undefined
                }
                aria-invalid={Boolean(questionError?.prompt)}
                aria-label={`Câu hỏi ${questionIndex + 1}`}
                disabled={!pending}
                {...form.register(`questions.${questionIndex}.prompt` as const)}
              />
              {questionError?.prompt?.message ? (
                <p
                  className="text-xs text-destructive"
                  id={`candidate-question-${questionIndex}-error`}
                  role="alert"
                >
                  {questionError.prompt.message}
                </p>
              ) : null}
              <RadioGroup
                aria-describedby={
                  questionError?.message
                    ? `candidate-question-${questionIndex}-options-error`
                    : undefined
                }
                className="grid gap-2 sm:grid-cols-2"
                disabled={!pending}
                onValueChange={(selected) =>
                  updateCorrectOption(questionIndex, Number(selected))
                }
                value={String(
                  Math.max(
                    0,
                    question.options.findIndex((option) => option.correct),
                  ),
                )}
              >
                {question.options.map((option, optionIndex) => (
                  <div
                    className="flex items-center gap-2 rounded-lg border p-2"
                    key={optionIndex}
                  >
                    <RadioGroupItem
                      aria-label={`Đặt đáp án ${optionIndex + 1} là đúng`}
                      value={String(optionIndex)}
                    />
                    {option.correct ? (
                      <Check aria-label="Đúng" className="size-4" />
                    ) : (
                      <X
                        aria-label="Nhiễu"
                        className="size-4 text-muted-foreground"
                      />
                    )}
                    <div className="flex-1 space-y-1">
                      <Input
                        aria-describedby={
                          questionError?.options?.[optionIndex]?.text
                            ? `candidate-question-${questionIndex}-option-${optionIndex}-error`
                            : undefined
                        }
                        aria-invalid={Boolean(
                          questionError?.options?.[optionIndex]?.text,
                        )}
                        aria-label={`Đáp án ${optionIndex + 1}`}
                        disabled={!pending}
                        {...form.register(
                          `questions.${questionIndex}.options.${optionIndex}.text` as const,
                        )}
                      />
                      {questionError?.options?.[optionIndex]?.text?.message ? (
                        <p
                          className="text-xs text-destructive"
                          id={`candidate-question-${questionIndex}-option-${optionIndex}-error`}
                          role="alert"
                        >
                          {questionError.options[optionIndex].text.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </RadioGroup>
              {questionError?.message ? (
                <p
                  className="text-xs text-destructive"
                  id={`candidate-question-${questionIndex}-options-error`}
                  role="alert"
                >
                  {questionError.message}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {candidate.questions[questionIndex]?.translation}
              </p>
              <p className="text-xs text-muted-foreground">
                {candidate.questions[questionIndex]?.explanation}
              </p>
            </div>
          );
        })}
      </section>

      {candidate.convertedPassageId !== null ? (
        <Button asChild variant="link">
          <Link href={`/reading-passages?edit=${candidate.convertedPassageId}`}>
            Mở Reading passage đã chuyển đổi
            <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="reject-reason">Lý do từ chối</Label>
            <Input
              className="mt-2"
              id="reject-reason"
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </div>
          <Button
            disabled={rejecting}
            onClick={() => void rejectCandidate()}
            type="button"
            variant="outline"
          >
            Từ chối
          </Button>
          <Button
            disabled={converting}
            onClick={() => void requestConvert()}
            type="button"
          >
            Chuyển thành draft
          </Button>
        </div>
      ) : (
        <Badge variant="outline">
          Candidate không còn ở trạng thái chờ duyệt
        </Badge>
      )}

      <AlertDialog onOpenChange={setConfirmConvert} open={confirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tạo Reading draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Candidate sẽ được chuyển thành một passage bản nháp với nội dung
              đang hiển thị.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submitConvert();
              }}
            >
              Xác nhận chuyển đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
