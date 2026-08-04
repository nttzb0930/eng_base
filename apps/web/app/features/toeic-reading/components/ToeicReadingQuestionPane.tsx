import type {
  ToeicReadingLearnerQuestion,
  ToeicReadingPracticeAnswerResult,
} from "@repo/shared";
import {
  Bookmark,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

type ToeicReadingQuestionPaneProps = {
  question: ToeicReadingLearnerQuestion;
  answer?: ToeicReadingPracticeAnswerResult;
  pendingOptionId?: number;
  markedForReview: boolean;
  grading: boolean;
  gradeFailed: boolean;
  onSelect: (optionId: number) => void;
  onRetry: () => void;
  onToggleReview: () => void;
};

export function ToeicReadingQuestionPane({
  question,
  answer,
  pendingOptionId,
  markedForReview,
  grading,
  gradeFailed,
  onSelect,
  onRetry,
  onToggleReview,
}: ToeicReadingQuestionPaneProps) {
  const t = useTranslations("toeicReading");
  const selectedOptionId = answer?.selectedOptionId ?? pendingOptionId;
  const locked = Boolean(answer) || grading || gradeFailed;

  return (
    <fieldset
      id={`toeic-practice-question-${question.id}`}
      tabIndex={-1}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-5 dark:border-slate-800 dark:bg-slate-950"
    >
      <legend className="sr-only">
        {t("practice.questionNumber", { number: question.number })}
      </legend>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p
          aria-hidden="true"
          className="min-w-0 flex-1 text-base font-semibold leading-7"
        >
          <span className="mr-2 text-emerald-700 dark:text-emerald-300">
            {question.number}.
          </span>
          {question.prompt}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-pressed={markedForReview}
          aria-label={
            markedForReview ? t("practice.marked") : t("practice.markForReview")
          }
          onClick={onToggleReview}
          className={cn(
            "h-9 w-9 shrink-0 rounded-md border",
            markedForReview && "border-amber-400 bg-amber-50 text-amber-700"
          )}
        >
          <Bookmark
            className={cn("h-4 w-4", markedForReview && "fill-current")}
          />
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          const correct = answer?.correctOption.id === option.id;
          const selectedIncorrect = Boolean(
            answer && selected && !answer.correct
          );
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border px-4 py-3 text-left text-sm leading-6 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default disabled:opacity-100",
                !answer &&
                  selected &&
                  "border-sky-500 bg-sky-50 dark:bg-sky-950",
                !answer &&
                  !selected &&
                  "hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30",
                correct &&
                  "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50",
                selectedIncorrect &&
                  "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-50"
              )}
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                {correct ? (
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : selectedIncorrect ? (
                  <XCircle
                    className="h-5 w-5 text-rose-600"
                    aria-hidden="true"
                  />
                ) : grading && selected ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-sky-600"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="h-4 w-4 rounded-full border border-slate-400"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-300">
                ({option.label})
              </span>
              <span className="min-w-0">{option.text}</span>
            </button>
          );
        })}
      </div>

      {gradeFailed ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          <span>{t("practice.gradeError")}</span>
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("practice.retryGrade")}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
