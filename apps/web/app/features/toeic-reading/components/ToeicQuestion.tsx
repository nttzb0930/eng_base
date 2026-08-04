import type { ToeicReadingLearnerQuestion } from "@repo/shared";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

type ToeicQuestionProps = {
  question: ToeicReadingLearnerQuestion;
  selectedOptionId?: number;
  markedForReview: boolean;
  onSelect: (optionId: number) => void;
  onToggleReview: () => void;
};

export function ToeicQuestion({
  question,
  selectedOptionId,
  markedForReview,
  onSelect,
  onToggleReview,
}: ToeicQuestionProps) {
  const t = useTranslations("toeicReading");

  return (
    <fieldset
      id={`toeic-question-${question.id}`}
      tabIndex={-1}
      className="bg-card scroll-mt-6 rounded-2xl border p-5 sm:p-6"
    >
      <legend className="sr-only">
        {question.number}. {question.prompt}
      </legend>
      <div className="flex items-start justify-between gap-4">
        <p
          aria-hidden="true"
          className="min-w-0 flex-1 text-base font-semibold leading-7"
        >
          <span className="mr-2 text-emerald-700 dark:text-emerald-300">
            {question.number}.
          </span>
          {question.prompt}
        </p>
        <button
          type="button"
          aria-pressed={markedForReview}
          aria-label={
            markedForReview ? t("session.marked") : t("session.markForReview")
          }
          onClick={onToggleReview}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-3",
            markedForReview
              ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "text-muted-foreground hover:border-emerald-400 hover:text-emerald-700"
          )}
        >
          <Bookmark
            className={cn("h-4 w-4", markedForReview && "fill-current")}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">
            {markedForReview ? t("session.marked") : t("session.markForReview")}
          </span>
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 transition-colors",
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50"
                  : "hover:bg-muted/50 hover:border-emerald-400"
              )}
            >
              <input
                type="radio"
                name={`toeic-question-${question.id}`}
                value={option.id}
                checked={selected}
                onChange={() => onSelect(option.id)}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span
                aria-hidden="true"
                className="font-semibold text-emerald-700 dark:text-emerald-300"
              >
                {option.label}
              </span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
