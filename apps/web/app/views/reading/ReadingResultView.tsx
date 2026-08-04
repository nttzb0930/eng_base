"use client";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useReadingResult } from "@/app/features/reading/hooks/use-reading";

type ReadingResultViewProps = {
  attemptId: number;
};

export function ReadingResultView({ attemptId }: ReadingResultViewProps) {
  const t = useTranslations("reading");
  const resultQuery = useReadingResult(attemptId);

  if (resultQuery.isLoading) {
    return (
      <main
        role="status"
        aria-label={t("loading")}
        className="flex min-h-dvh items-center justify-center bg-slate-50"
      >
        <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
      </main>
    );
  }

  if (resultQuery.isError || !resultQuery.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center">
          <h1 className="font-bold text-slate-950">{t("error.title")}</h1>
          <p className="mt-2 text-sm text-slate-600">
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
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
            {t("result.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {result.passageTitle}
          </h1>
          <div className="mt-7 flex flex-col gap-5 border-t border-slate-200 pt-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-5xl font-bold tracking-tight text-slate-950">
                {result.accuracy}%
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {t("result.score", {
                  correct: result.correctCount,
                  total: result.totalCount,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/reading">
                  {t("result.backToList")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="answer-review-title"
          className="mt-7 space-y-4"
        >
          <h2
            id="answer-review-title"
            className="text-xl font-bold text-slate-950"
          >
            {t("result.reviewTitle")}
          </h2>
          {result.answers.map((answer, index) => (
            <article
              key={answer.questionId}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-start gap-3">
                {answer.correct ? (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("result.question", { number: index + 1 })} ·{" "}
                    {answer.correct
                      ? t("result.correct")
                      : t("result.incorrect")}
                  </p>
                  <h3 className="mt-2 font-semibold leading-6 text-slate-950">
                    {answer.question}
                  </h3>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold text-slate-500">
                    {t("result.yourAnswer")}
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {answer.selectedOption}
                  </dd>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <dt className="text-xs font-semibold text-emerald-700">
                    {t("result.correctAnswer")}
                  </dt>
                  <dd className="mt-1 font-medium text-emerald-950">
                    {answer.correctOption}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
