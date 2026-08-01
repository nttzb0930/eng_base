"use client";

import { ArrowLeft, ArrowRight, BookOpen, Play, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicGrammarLessonContent } from "@/app/features/toeic-grammar/components/ToeicGrammarLessonContent";
import { ToeicGrammarLessonSkeleton } from "@/app/features/toeic-grammar/components/ToeicGrammarLessonSkeleton";
import { ToeicGrammarSubtopicNavigation } from "@/app/features/toeic-grammar/components/ToeicGrammarSubtopicNavigation";
import {
  useToeicGrammarCatalog,
  useToeicGrammarSubtopic,
} from "@/app/features/toeic-grammar/hooks/use-toeic-grammar";
import { resolveToeicGrammarDetailTab } from "@/app/features/toeic-grammar/toeic-grammar-route";

type ToeicGrammarLessonViewProps = {
  subtopicId: string;
  tab: "lesson" | "practice";
};

export function ToeicGrammarLessonView({
  subtopicId,
  tab,
}: ToeicGrammarLessonViewProps) {
  const t = useTranslations("toeicGrammar.lesson");
  const locale = useLocale();
  const query = useToeicGrammarSubtopic(subtopicId);
  const catalogQuery = useToeicGrammarCatalog();

  if (query.isLoading || catalogQuery.isLoading) {
    return <ToeicGrammarLessonSkeleton />;
  }
  if (
    query.isError ||
    catalogQuery.isError ||
    !query.data ||
    !catalogQuery.data
  ) {
    return (
      <FeedWrapper>
        <div className="mx-auto max-w-lg rounded-2xl border p-8 text-center">
          <h1 className="text-lg font-semibold">{t("error")}</h1>
          <Button
            className="mt-5 gap-2"
            onClick={() => {
              void query.refetch();
              void catalogQuery.refetch();
            }}
          >
            <RotateCcw className="h-4 w-4" /> {t("retry")}
          </Button>
        </div>
      </FeedWrapper>
    );
  }

  const detail = query.data;
  const topic = catalogQuery.data.topics.find(
    (candidate) => candidate.target === detail.topicTarget
  );
  const topicTitle =
    locale === "vi"
      ? detail.topicTitleVi
      : (detail.topicTitleEn ?? detail.topicTitleVi);
  const detailTitle =
    locale === "vi" ? detail.titleVi : (detail.titleEn ?? detail.titleVi);
  const hasLesson = detail.lessons.length > 0;
  const effectiveTab = resolveToeicGrammarDetailTab(tab, hasLesson);
  const answered =
    detail.progress.correctCount + detail.progress.incorrectCount;

  return (
    <FeedWrapper>
      <div className="mx-auto w-full max-w-[1180px] pb-12">
        <Link
          href="/learn/cert/toeic/reading/grammar"
          className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>

        <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ToeicGrammarSubtopicNavigation
            topicTitle={topicTitle}
            subtopics={topic?.subtopics ?? []}
            selectedTarget={detail.target}
          />

          <main className="min-w-0">
            <header className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                {topicTitle}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {detailTitle}
              </h1>
              {detail.descriptionVi ? (
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {detail.descriptionVi}
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{t("progress")}</span>
                <strong>
                  {answered}/{detail.progress.questionCount}
                </strong>
              </div>
            </header>

            {hasLesson ? (
              <nav
                aria-label={t("tabsLabel")}
                className="bg-muted grid grid-cols-2 rounded-xl p-1"
              >
                <Link
                  href={`/learn/cert/toeic/reading/grammar/${encodeURIComponent(subtopicId)}?tab=lesson`}
                  aria-current={
                    effectiveTab === "lesson" ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${effectiveTab === "lesson" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  <BookOpen className="h-4 w-4" />
                  {t("tabs.lesson")}
                </Link>
                <Link
                  href={`/learn/cert/toeic/reading/grammar/${encodeURIComponent(subtopicId)}?tab=practice`}
                  aria-current={
                    effectiveTab === "practice" ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${effectiveTab === "practice" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                >
                  <Play className="h-4 w-4" />
                  {t("tabs.practice")}
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                    {detail.progress.questionCount}
                  </span>
                </Link>
              </nav>
            ) : null}

            <div className={hasLesson ? "mt-6" : undefined}>
              {effectiveTab === "lesson" ? (
                <ToeicGrammarLessonContent
                  lessons={detail.lessons}
                  emptyLabel={t("empty")}
                />
              ) : (
                <section className="bg-card rounded-2xl border p-8 text-center shadow-sm">
                  <Play className="mx-auto h-8 w-8 text-emerald-600" />
                  <h2 className="mt-4 text-xl font-semibold">
                    {t("practiceTitle")}
                  </h2>
                  <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
                    {t("practiceDescription", {
                      count: detail.progress.questionCount,
                    })}
                  </p>
                  <Link
                    href={`/toeic/grammar/practice?mode=subtopic&target=${encodeURIComponent(subtopicId)}`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {answered > 0 ? t("continuePractice") : t("startPractice")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </FeedWrapper>
  );
}
