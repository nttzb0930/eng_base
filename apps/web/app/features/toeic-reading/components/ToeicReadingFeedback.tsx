import type { ToeicReadingPracticeAnswerResult } from "@repo/shared";
import { CheckCircle2, Languages, Lightbulb, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function ToeicReadingFeedback({
  answer,
}: {
  answer?: ToeicReadingPracticeAnswerResult;
}) {
  const t = useTranslations("toeicReading");
  if (!answer) return null;

  return (
    <section className="space-y-3" aria-live="polite">
      <div
        className={
          answer.correct
            ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            : "rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
        }
      >
        <div className="flex items-center gap-2 font-semibold">
          {answer.correct ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          {answer.correct ? t("practice.correct") : t("practice.incorrect")}
        </div>
        {!answer.correct ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold">
              {t("practice.correctAnswer")}:
            </span>{" "}
            ({answer.correctOption.label}) {answer.correctOption.text}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/50">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-200">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          {t("practice.explanation")}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {answer.explanation ?? t("practice.noExplanation")}
        </p>
      </div>

      {answer.questionTranslation ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/50">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-200">
            <Languages className="h-4 w-4" aria-hidden="true" />
            {t("practice.translation")}
          </h3>
          <p className="mt-2 text-sm leading-6">{answer.questionTranslation}</p>
        </div>
      ) : null}
    </section>
  );
}
