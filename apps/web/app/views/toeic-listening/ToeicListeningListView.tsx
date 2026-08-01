"use client";

import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  History,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicSectionNav } from "@/app/features/toeic/components/ToeicSectionNav";
import { ToeicListeningListSkeleton } from "@/app/features/toeic-listening/components/ToeicListeningListSkeleton";
import { ToeicListeningModeTabs } from "@/app/features/toeic-listening/components/ToeicListeningModeTabs";
import { ToeicListeningScopeTabs } from "@/app/features/toeic-listening/components/ToeicListeningScopeTabs";
import { useToeicListeningTests } from "@/app/features/toeic-listening/hooks/use-toeic-listening";
import {
  scopeToPart,
  type ToeicListeningScope,
} from "@/app/features/toeic-listening/toeic-listening-scope";
import { toeicReadingDisplayTitle } from "@/app/features/toeic-reading/toeic-reading-display-title";

type ToeicListeningListViewProps = {
  scope: ToeicListeningScope;
};

export function ToeicListeningListView({ scope }: ToeicListeningListViewProps) {
  const t = useTranslations("toeicListening");
  const part = scopeToPart(scope);
  const testsQuery = useToeicListeningTests(part);

  if (testsQuery.isLoading) return <ToeicListeningListSkeleton />;
  if (testsQuery.isError || !testsQuery.data) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("error.description")}
          </p>
          <Button
            type="button"
            onClick={() => testsQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  return (
    <FeedWrapper>
      <div className="pb-12">
        <Link
          href="/learn/cert/toeic"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("list.back")}
        </Link>

        <ToeicSectionNav active="listening" />

        <header className="mt-7 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("list.title")}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {t("list.description")}
          </p>
        </header>

        <ToeicListeningModeTabs mode="level" />
        <ToeicListeningScopeTabs scope={scope} />

        {testsQuery.data.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed px-6 py-12 text-center">
            <Headphones className="text-muted-foreground mx-auto h-8 w-8" />
            <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {t("empty.description")}
            </p>
          </section>
        ) : (
          <section
            aria-label={t("list.availableTests")}
            className="mt-8 grid gap-5 md:grid-cols-2"
          >
            {testsQuery.data.map((testItem) => {
              const answered = testItem.draftProgress?.answeredCount ?? 0;
              return (
                <article
                  key={testItem.id}
                  className="bg-card flex flex-col rounded-2xl border p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {scope === "full"
                          ? t("list.fullTest")
                          : t("part", { part: scope })}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {toeicReadingDisplayTitle({
                          sourceSetName: testItem.sourceSetName,
                          testTitle: testItem.title,
                        })}
                      </h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {t("list.questionCount", {
                        count: testItem.questionCount,
                      })}
                    </span>
                  </div>

                  <dl
                    className={`mt-6 grid gap-3 ${
                      scope === "full"
                        ? "grid-cols-2 sm:grid-cols-4"
                        : "grid-cols-1"
                    }`}
                  >
                    {testItem.parts
                      .filter(
                        (partItem) =>
                          scope === "full" || partItem.part === scope
                      )
                      .map((partItem) => (
                        <div
                          key={partItem.part}
                          className="bg-muted/60 rounded-xl p-3"
                        >
                          <dt className="text-muted-foreground text-xs font-semibold">
                            {t("part", { part: partItem.part })}
                          </dt>
                          <dd className="mt-1 text-lg font-semibold">
                            {partItem.questionCount}
                          </dd>
                        </div>
                      ))}
                  </dl>

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground font-medium">
                        {t("list.progress")}
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {t("list.progressCount", {
                          answered,
                          total: testItem.questionCount,
                        })}
                      </span>
                    </div>
                    <div
                      className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
                      role="progressbar"
                      aria-label={t("list.progress")}
                      aria-valuemin={0}
                      aria-valuemax={testItem.questionCount}
                      aria-valuenow={answered}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-[width]"
                        style={{
                          width: `${
                            testItem.questionCount
                              ? (answered / testItem.questionCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
                      <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {t("list.answered", { count: answered })}
                      </span>
                      <span className="bg-muted rounded-xl px-3 py-2">
                        {t("list.remaining", {
                          count: Math.max(0, testItem.questionCount - answered),
                        })}
                      </span>
                    </div>
                  </div>

                  {testItem.latestAttempt ? (
                    <p className="text-muted-foreground mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                      <History className="h-4 w-4" aria-hidden="true" />
                      {t("list.latestScore", {
                        accuracy: testItem.latestAttempt.accuracy,
                      })}
                    </p>
                  ) : (
                    <p className="text-muted-foreground mt-5 text-sm">
                      {t("list.notAttempted")}
                    </p>
                  )}

                  <Link
                    href={`/toeic/listening/tests/${testItem.id}?scope=${scope}`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
                  >
                    {testItem.draftProgress
                      ? t("list.continue")
                      : testItem.latestAttempt
                        ? t("list.retry")
                        : t("list.start")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </FeedWrapper>
  );
}
