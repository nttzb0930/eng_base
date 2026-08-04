"use client";

import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicReadingResultSkeleton } from "@/app/features/toeic-reading/components/ToeicReadingResultSkeleton";
import { useToeicReadingAttempt } from "@/app/features/toeic-reading/hooks/use-toeic-reading";

type ToeicReadingResultViewProps = {
  attemptId: number;
};

export function ToeicReadingResultView({
  attemptId,
}: ToeicReadingResultViewProps) {
  const t = useTranslations("toeicReading");
  const resultQuery = useToeicReadingAttempt(attemptId);

  if (resultQuery.isLoading) return <ToeicReadingResultSkeleton />;
  if (resultQuery.isError || !resultQuery.data) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6">
        <section className="bg-card max-w-md rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <XCircle className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className="mt-4 text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("result.notAvailable")}
          </p>
          <Button
            type="button"
            onClick={() => resultQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const result = resultQuery.data;
  return (
    <main className="bg-background min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/learn/cert/toeic/reading?scope=${
            result.practicePart ?? "full"
          }`}
          className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("result.backToTests")}
        </Link>

        <section className="bg-card mt-6 rounded-2xl border p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            {result.practicePart === null
              ? t("result.fullTest")
              : t("result.partPractice", { part: result.practicePart })}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {result.testTitle}
          </h1>
          <div className="mt-7 flex flex-wrap items-end gap-3">
            <span className="text-5xl font-semibold text-emerald-600 dark:text-emerald-400">
              {result.accuracy}%
            </span>
            <span className="text-muted-foreground pb-1 text-sm font-semibold">
              {t("result.score", {
                correct: result.correctCount,
                total: result.totalCount,
              })}
            </span>
          </div>
          <dl className="mt-7 grid gap-3 sm:grid-cols-3">
            {result.parts.map((part) => (
              <div key={part.part} className="bg-muted/60 rounded-xl p-4">
                <dt className="text-sm font-semibold">
                  {t("part", { part: part.part })}
                </dt>
                <dd className="mt-2 text-2xl font-semibold">
                  {part.accuracy}%
                </dd>
                <dd className="text-muted-foreground mt-1 text-xs">
                  {t("result.partScore", {
                    correct: part.correctCount,
                    total: part.totalCount,
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="toeic-result-review" className="mt-9">
          <h2 id="toeic-result-review" className="text-xl font-semibold">
            {t("result.reviewTitle")}
          </h2>
          <div className="mt-4 space-y-4">
            {result.answers.map((answer) => (
              <article
                key={answer.questionId}
                className={`bg-card rounded-2xl border p-5 sm:p-6 ${
                  answer.correct
                    ? "border-emerald-300 dark:border-emerald-800"
                    : "border-rose-300 dark:border-rose-900"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold">
                      {t("part", { part: answer.part })}
                    </p>
                    <h3 className="mt-1 font-semibold leading-7">
                      {t("result.question", {
                        number: answer.questionNumber,
                      })}
                      : {answer.question}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      answer.correct
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                    }`}
                  >
                    {answer.correct ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    )}
                    {answer.correct
                      ? t("result.correct")
                      : t("result.incorrect")}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="bg-muted/60 rounded-xl p-4">
                    <dt className="text-muted-foreground text-xs font-semibold">
                      {t("result.yourAnswer")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      <span className="mr-2 font-semibold">
                        {answer.selectedOptionLabel}
                      </span>
                      {answer.selectedOption}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950">
                    <dt className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      {t("result.correctAnswer")}
                    </dt>
                    <dd className="mt-1 text-sm">
                      <span className="mr-2 font-semibold">
                        {answer.correctOptionLabel}
                      </span>
                      {answer.correctOption}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t pt-4">
                  <h4 className="text-muted-foreground text-xs font-semibold">
                    {t("result.explanation")}
                  </h4>
                  <p className="mt-1 text-sm leading-6">
                    {answer.explanation ?? t("result.noExplanation")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
