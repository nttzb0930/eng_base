"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Compass,
  Flame,
  GraduationCap,
  Headphones,
  Play,
  PlusCircle,
  RotateCw,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { LearnPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useDashboard } from "@/app/features/dashboard/hooks/use-dashboard";
import {
  useCefrLevelProgress,
  useCourseProgress,
  useUserProgress,
} from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

function LearnFeedback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <FeedWrapper>
      <div className="border-border/80 bg-card shadow-xs rounded-2xl border p-8 text-center">
        <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
          {description}
        </p>
      </div>
    </FeedWrapper>
  );
}

export function LearnView() {
  const t = useTranslations("learn");
  const dashboardT = useTranslations("dashboard");
  const topicsT = useTranslations("topics");
  const router = useRouter();
  const locale = useCurrentLocale();
  const courseProgressQuery = useCourseProgress();
  const userProgressQuery = useUserProgress();
  const dashboardQuery = useDashboard();
  const cefrProgressQuery = useCefrLevelProgress();
  const courseProgress = courseProgressQuery.data;
  const userProgress = userProgressQuery.data;
  const dashboard = dashboardQuery.data;
  const cefrSummary = cefrProgressQuery.data;
  const hasQueryError =
    courseProgressQuery.isError ||
    userProgressQuery.isError ||
    dashboardQuery.isError ||
    cefrProgressQuery.isError;

  useEffect(() => {
    if (
      !hasQueryError &&
      !courseProgressQuery.isLoading &&
      !userProgressQuery.isLoading &&
      (!courseProgress || !userProgress || !userProgress.activeCourse)
    ) {
      router.replace(withLocale("/placement-test", locale));
    }
  }, [
    courseProgress,
    courseProgressQuery.isLoading,
    hasQueryError,
    locale,
    router,
    userProgress,
    userProgressQuery.isLoading,
  ]);

  if (hasQueryError) {
    return (
      <LearnFeedback
        title={t("dataErrorTitle")}
        description={t("dataErrorDescription")}
      />
    );
  }

  if (
    courseProgressQuery.isLoading ||
    userProgressQuery.isLoading ||
    dashboardQuery.isLoading ||
    cefrProgressQuery.isLoading ||
    !courseProgress ||
    !userProgress ||
    !userProgress.activeCourse ||
    !dashboard
  ) {
    return <LearnPageSkeleton />;
  }

  if (!cefrSummary || cefrSummary.levels.length === 0) {
    return (
      <LearnFeedback title={t("levelsTitle")} description={t("noCefrData")} />
    );
  }

  const unlockedLevels = cefrSummary.levels.filter((level) => level.unlocked);
  const currentLevel =
    unlockedLevels.find((level) => level.masteredWords < level.totalWords) ??
    unlockedLevels.at(-1) ??
    cefrSummary.levels[0]!;
  const currentLevelPercent = currentLevel.totalWords
    ? Math.round((currentLevel.masteredWords / currentLevel.totalWords) * 100)
    : 0;
  const remainingLessons = cefrSummary.levels.reduce(
    (total, level) =>
      total + Math.max(0, level.totalLessons - level.completedLessons),
    0
  );
  const learnedWords = cefrSummary.levels.reduce(
    (total, level) => total + level.learnedWords,
    0
  );

  return (
    <FeedWrapper>
      <div className="pb-12">
        <header className="mb-7">
          <div className="eyebrow inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <BookOpen className="h-4 w-4" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className="text-foreground mt-2.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2.5 line-clamp-1 text-sm">
            {t("description")}
          </p>
        </header>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] p-6 text-white shadow-xl sm:p-8 dark:from-[#059669] dark:to-[#047857]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white opacity-5" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white opacity-5" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-1 text-sm font-medium text-white backdrop-blur-md">
                  <Calendar className="h-4 w-4" />
                  <span>{t("today")}</span>
                </span>
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-1 text-sm font-medium text-white backdrop-blur-md"
                  title={dashboardT("streakTimeZone")}
                >
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {dashboardT("currentStreak", {
                      count: dashboard.streak.currentStreak,
                    })}
                  </span>
                </span>
              </div>

              <h2 className="mb-2 text-3xl font-bold tracking-tight text-white">
                {t("wordsAwaitingReview", {
                  count: dashboard.overview.dueWords,
                })}
              </h2>
              <p className="mb-6 max-w-xl text-sm leading-relaxed text-emerald-100">
                {t("reviewSubtitle")}
              </p>

              <div className="grid max-w-md grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-md">
                  <div className="text-2xl font-bold text-white">
                    {dashboard.overview.masteredWords}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    {topicsT("mastered")}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-md">
                  <div className="text-2xl font-bold text-white">
                    {dashboard.overview.dueWords}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    {t("dueWords")}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-md">
                  <div className="text-2xl font-bold text-white">
                    {dashboard.overview.accuracy}%
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    {t("accuracy")}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-start justify-center md:items-end md:text-right">
              <Link
                href={withLocale("/review")}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-emerald-50 hover:shadow-xl active:scale-95"
              >
                <Play
                  className="h-4 w-4 fill-emerald-600 text-emerald-600"
                  aria-hidden="true"
                />
                <span>{t("reviewWeakWordsBtn")}</span>
              </Link>
              <p className="mt-3 text-sm font-medium text-emerald-100">
                {t("reviewEstTime", {
                  count: dashboard.overview.dueWords,
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t("learningPaths")}
            </p>
            <h3 className="text-foreground mt-1 text-xl font-semibold">
              {t("chooseModeTitle")}
            </h3>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.85fr]">
            <article
              aria-labelledby="general-english-path-title"
              className="border-border/80 bg-card shadow-xs rounded-2xl border p-5 sm:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4
                    id="general-english-path-title"
                    className="text-foreground text-xl font-semibold"
                  >
                    {t("generalEnglishTitle")}
                  </h4>
                  <p className="text-muted-foreground mt-1 max-w-[60ch] text-sm leading-6">
                    {t("generalEnglishDescription")}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="group flex flex-col rounded-xl border border-blue-200/80 bg-blue-50/40 p-5 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                      {currentLevel.level}
                    </span>
                    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-300">
                      {currentLevelPercent}%
                    </span>
                  </div>
                  <h5 className="text-foreground mt-4 text-base font-semibold">
                    {t("cefrPathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("byLevelDesc")}
                  </p>
                  <div className="mt-4 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {t("masteredProgress", {
                      mastered: currentLevel.masteredWords,
                      total: currentLevel.totalWords,
                    })}
                  </div>
                  <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
                      style={{ width: `${currentLevelPercent}%` }}
                    />
                  </div>
                  <Link
                    href={withLocale("/learn/level")}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    {t("continueLevelBtn", { code: currentLevel.level })}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className="group flex flex-col rounded-xl border border-orange-200/80 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-orange-950/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white">
                    <Compass className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h5 className="text-foreground mt-4 text-base font-semibold">
                    {t("topicPathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("byTopicDesc")}
                  </p>
                  <Link
                    href={withLocale("/learn/topic")}
                    className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  >
                    {t("explorePath")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>

            <article
              aria-labelledby="toeic-path-title"
              className="border-border/80 bg-card shadow-xs flex flex-col rounded-2xl border-2 border-emerald-500/70 p-5 sm:p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </div>
              <h4
                id="toeic-path-title"
                className="text-foreground mt-5 text-xl font-semibold"
              >
                {t("toeicPathTitle")}
              </h4>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t("toeicPathDescription")}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3" aria-hidden="true">
                <div className="bg-muted/60 rounded-lg p-3">
                  <Headphones className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <p className="mt-2 text-xs font-semibold">Part 1–4</p>
                </div>
                <div className="bg-muted/60 rounded-lg p-3">
                  <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <p className="mt-2 text-xs font-semibold">Part 5–7</p>
                </div>
              </div>
              <Link
                href={withLocale("/learn/cert/toeic")}
                className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {t("openToeic")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t("todayOverview")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border-border/80 bg-card shadow-xs group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400">
                  <RotateCw className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("dueWords")}
                </span>
              </div>
              <div className="text-foreground text-2xl font-bold">
                {topicsT("wordCount", {
                  count: dashboard.overview.dueWords,
                })}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("remainingLessons")}
                </span>
              </div>
              <div className="text-foreground text-2xl font-bold">
                {t("lessonsCount", { count: remainingLessons })}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("unlockedLevelsLabel")}
                </span>
              </div>
              <div className="text-foreground text-2xl font-bold">
                {unlockedLevels.length}/{cefrSummary.levels.length}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-800 dark:bg-rose-950/50">
                  <Target className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                  {t("learnedWords")}
                </span>
              </div>
              <div className="text-foreground text-2xl font-bold">
                {topicsT("wordCount", { count: learnedWords })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </FeedWrapper>
  );
}
