import type {
  ToeicGrammarAnswerResult,
  ToeicGrammarLearnerQuestion,
} from "@repo/shared";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

type ToeicGrammarQuestionProps = {
  question: ToeicGrammarLearnerQuestion;
  selectedOptionId: number | null;
  feedback: ToeicGrammarAnswerResult | null;
  pending: boolean;
  onSelect: (optionId: number) => void;
};

export function ToeicGrammarQuestion({
  question,
  selectedOptionId,
  feedback,
  pending,
  onSelect,
}: ToeicGrammarQuestionProps) {
  const t = useTranslations("toeicGrammar.practice");
  const locked = pending || feedback !== null;

  return (
    <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        {t("question", { number: question.number ?? question.id })}
      </p>
      <h1 className="mt-3 text-lg font-semibold leading-8 sm:text-xl">
        {question.prompt}
      </h1>

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">{t("chooseAnswer")}</legend>
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          const correct = feedback?.correctOptionId === option.id;
          const incorrect = Boolean(feedback && selected && !feedback.correct);
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.id)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default disabled:opacity-100",
                correct &&
                  "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                incorrect &&
                  "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
                selected &&
                  !feedback &&
                  "border-sky-500 bg-sky-50 dark:bg-sky-950",
                !selected &&
                  !correct &&
                  "hover:bg-muted/60 hover:border-emerald-300"
              )}
            >
              <span className="bg-background inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-semibold">
                {option.label}
              </span>
              <span className="min-w-0 flex-1 leading-6">{option.text}</span>
              {pending && selected ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-sky-600"
                  aria-label={t("checking")}
                />
              ) : correct ? (
                <Check
                  className="h-5 w-5 text-emerald-600"
                  aria-label={t("correct")}
                />
              ) : incorrect ? (
                <X
                  className="h-5 w-5 text-rose-600"
                  aria-label={t("incorrect")}
                />
              ) : null}
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}
