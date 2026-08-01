"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Headphones,
  RotateCcw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicOverviewSkeleton } from "@/app/features/toeic-reading/components/ToeicOverviewSkeleton";
import { useToeicListeningOverview } from "@/app/features/toeic-listening/hooks/use-toeic-listening";
import { useToeicReadingOverview } from "@/app/features/toeic-reading/hooks/use-toeic-reading";

export function ToeicOverviewView() {
  const t = useTranslations("toeicReading");
  const locale = useLocale();
  const overviewQuery = useToeicReadingOverview();
  const listeningQuery = useToeicListeningOverview();

  if (overviewQuery.isLoading || listeningQuery.isLoading)
    return <ToeicOverviewSkeleton />;

  if (
    overviewQuery.isError ||
    !overviewQuery.data ||
    listeningQuery.isError ||
    !listeningQuery.data
  ) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("error.description")}
          </p>
          <Button
            type="button"
            onClick={() => {
              void Promise.all([
                overviewQuery.refetch(),
                listeningQuery.refetch(),
              ]);
            }}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  const overview = overviewQuery.data;
  const listening = listeningQuery.data;
  return (
    <FeedWrapper>
      <div className="pb-12">
        <Link
          href="/learn/cert"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("overview.back")}
        </Link>

        <header className="mt-7 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("overview.title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-sm leading-6">
            {t("overview.description")}
          </p>
        </header>

        <section
          aria-label={t("overview.skills")}
          className="mt-8 grid items-stretch gap-5 lg:grid-cols-2"
        >
          <article className="bg-card flex min-h-[21rem] flex-col rounded-2xl border-2 border-emerald-500/70 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Headphones className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {listening.listeningAvailable
                  ? t("overview.available")
                  : t("overview.unavailable")}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold">
              {t("overview.listening")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {t("overview.listeningDescription")}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-xs">
                  {t("overview.tests")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {listening.publishedTestCount}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-xs">
                  {t("overview.questions")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {listening.totalQuestionCount}
                </dd>
              </div>
            </dl>
            {listening.listeningAvailable ? (
              <Link
                href="/learn/cert/toeic/listening"
                className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
              >
                {t("overview.openListening")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-muted-foreground mt-auto text-sm font-medium">
                {t("overview.noListeningContent")}
              </p>
            )}
          </article>

          <article className="bg-card flex min-h-[21rem] flex-col rounded-2xl border-2 border-emerald-500/70 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {overview.readingAvailable
                  ? t("overview.available")
                  : t("overview.unavailable")}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold">
              {t("overview.reading")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {t("overview.readingDescription")}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-xs">
                  {t("overview.tests")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {overview.publishedTestCount}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-xs">
                  {t("overview.questions")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {overview.totalQuestionCount}
                </dd>
              </div>
            </dl>
            {overview.readingAvailable ? (
              <Link
                href="/learn/cert/toeic/reading"
                className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
              >
                {t("overview.openReading")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-muted-foreground mt-auto text-sm font-medium">
                {t("overview.noContent")}
              </p>
            )}
          </article>
        </section>

        <section aria-labelledby="toeic-recent-title" className="mt-9">
          <h2 id="toeic-recent-title" className="text-xl font-semibold">
            {t("overview.recent")}
          </h2>
          {overview.recentAttempts.length === 0 ? (
            <p className="text-muted-foreground mt-3 rounded-2xl border border-dashed p-6 text-sm">
              {t("overview.noAttempts")}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {overview.recentAttempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/toeic/reading/results/${attempt.id}`}
                  className="bg-card rounded-2xl border p-5 transition-colors hover:border-emerald-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{attempt.testTitle}</h3>
                      <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(new Date(attempt.submittedAt))}
                      </p>
                    </div>
                    <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                      {attempt.accuracy}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </FeedWrapper>
  );
}
