"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Calendar,
  Compass,
  Dumbbell,
  FilePenLine,
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
import { resolvePostAuthRedirect } from "@/app/features/auth/routing/resolve-post-auth-redirect";
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
      const postAuthTarget = resolvePostAuthRedirect(userProgress);
      const target =
        postAuthTarget === "/dashboard" && !courseProgress
          ? "/courses"
          : postAuthTarget;
      router.replace(withLocale(target, locale));
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

  const [toeicListeningLabel, toeicListeningParts] = t("toeicListeningSummary")
    .split("·")
    .map((s) => s.trim());
  const [toeicReadingLabel, toeicReadingParts] = t("toeicReadingSummary")
    .split("·")
    .map((s) => s.trim());
  const [toeicWritingLabel, toeicWritingParts] = t("toeicWritingSummary")
    .split("·")
    .map((s) => s.trim());

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
          <p className="text-muted-foreground mt-2.5 max-w-2xl text-sm leading-relaxed">
            {t("description")}
          </p>
        </header>

        <section className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] p-4 text-white shadow-xl sm:p-6 lg:p-8 dark:from-[#059669] dark:to-[#047857]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white opacity-5" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white opacity-5" />

          <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md sm:px-3.5 sm:text-sm">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{t("today")}</span>
                </span>
                <span
                  className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md sm:px-3.5 sm:text-sm"
                  title={dashboardT("streakTimeZone")}
                >
                  <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {dashboardT("currentStreak", {
                      count: dashboard.streak.currentStreak,
                    })}
                  </span>
                </span>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t("wordsAwaitingReview", {
                  count: dashboard.overview.dueWords,
                })}
              </h2>
              <p className="mb-5 max-w-xl text-xs leading-relaxed text-emerald-100 sm:text-sm sm:leading-6">
                {t("reviewSubtitle")}
              </p>

              <div className="grid max-w-md grid-cols-3 gap-1.5 sm:gap-4">
                <div className="rounded-xl bg-white/10 px-1.5 py-2 text-center backdrop-blur-md sm:p-3">
                  <div className="text-lg font-bold text-white sm:text-2xl">
                    {dashboard.overview.masteredWords}
                  </div>
                  <div className="mt-1 truncate text-[10px] font-medium leading-tight text-emerald-100 sm:text-xs sm:uppercase sm:tracking-wider">
                    {topicsT("mastered")}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-1.5 py-2 text-center backdrop-blur-md sm:p-3">
                  <div className="text-lg font-bold text-white sm:text-2xl">
                    {dashboard.overview.dueWords}
                  </div>
                  <div className="mt-1 truncate text-[10px] font-medium leading-tight text-emerald-100 sm:text-xs sm:uppercase sm:tracking-wider">
                    {t("dueWords")}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-1.5 py-2 text-center backdrop-blur-md sm:p-3">
                  <div className="text-lg font-bold text-white sm:text-2xl">
                    {dashboard.overview.accuracy}%
                  </div>
                  <div className="mt-1 truncate text-[10px] font-medium leading-tight text-emerald-100 sm:text-xs sm:uppercase sm:tracking-wider">
                    {t("accuracy")}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch justify-center sm:items-start md:items-end md:text-right">
              <Link
                href={withLocale("/review")}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-emerald-50 hover:shadow-xl active:scale-95 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
              >
                <Play
                  className="h-4 w-4 fill-emerald-600 text-emerald-600"
                  aria-hidden="true"
                />
                <span>{t("reviewWeakWordsBtn")}</span>
              </Link>
              <p className="mt-2.5 text-center text-xs font-medium text-emerald-100 sm:text-sm md:text-right">
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
              className="border-border/80 bg-card shadow-xs min-w-0 rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400 sm:h-11 sm:w-11">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
                <h4
                  id="general-english-path-title"
                  className="text-foreground min-w-0 flex-1 text-lg font-semibold sm:text-xl"
                >
                  {t("generalEnglishTitle")}
                </h4>
              </div>
              <p className="text-muted-foreground mt-2.5 max-w-[60ch] text-xs leading-relaxed sm:mt-3 sm:text-sm sm:leading-6">
                {t("generalEnglishDescription")}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="group flex flex-col rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
                      {currentLevel.level}
                    </span>
                    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-xs dark:bg-blue-950 dark:text-blue-300">
                      {currentLevelPercent}%
                    </span>
                  </div>
                  <h5 className="text-foreground mt-3 text-sm font-semibold sm:text-base">
                    {t("cefrPathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("byLevelDesc")}
                  </p>
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {t("masteredProgress", {
                        mastered: currentLevel.masteredWords,
                        total: currentLevel.totalWords,
                      })}
                    </div>
                    <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
                        style={{ width: `${currentLevelPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href={withLocale("/learn/level")}
                      className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-11 sm:text-sm"
                    >
                      <span className="truncate">{t("continueLevelBtn", { code: currentLevel.level })}</span>
                    </Link>
                  </div>
                </div>

                <div className="group flex flex-col rounded-xl border border-orange-200/80 bg-orange-50/40 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white sm:h-10 sm:w-10">
                    <Compass className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                  <h5 className="text-foreground mt-3 text-sm font-semibold sm:text-base">
                    {t("topicPathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("byTopicDesc")}
                  </p>
                  <div className="mt-auto pt-3">
                    <Link
                      href={withLocale("/learn/topic")}
                      className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:min-h-11 sm:text-sm"
                    >
                      <span className="truncate">{t("explorePath")}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="group flex flex-col rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white sm:h-10 sm:w-10">
                    <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                  <h5 className="text-foreground mt-3 text-sm font-semibold sm:text-base">
                    {t("practicePathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("practicePathDescription")}
                  </p>
                  <div className="mt-auto pt-3">
                    <Link
                      href={withLocale("/practice")}
                      className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-11 sm:text-sm"
                    >
                      <span className="truncate">{t("openPractice")}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="group flex flex-col rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white sm:h-10 sm:w-10">
                    <BookOpenText className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  </div>
                  <h5 className="text-foreground mt-3 text-sm font-semibold sm:text-base">
                    {t("readingPathTitle")}
                  </h5>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t("readingPathDescription")}
                  </p>
                  <div className="mt-auto pt-3">
                    <Link
                      href={withLocale("/reading")}
                      className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-11 sm:text-sm"
                    >
                      <span className="truncate">{t("openReading")}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            <article
              aria-labelledby="toeic-path-title"
              className="border-border/80 bg-card shadow-xs flex flex-col min-w-0 rounded-2xl border-2 border-emerald-500/70 p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 sm:h-11 sm:w-11">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    id="toeic-path-title"
                    className="text-foreground text-lg font-semibold sm:text-xl"
                  >
                    {t("toeicPathTitle")}
                  </h4>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {t("toeicFullSkills")}
                </span>
              </div>

              <p className="text-muted-foreground mt-3 text-xs leading-relaxed sm:text-sm sm:leading-6">
                {t("toeicPathDescription")}
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href={withLocale("/learn/cert/toeic/listening")}
                  className="group/item flex items-center justify-between rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-300">
                        {toeicListeningLabel}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {toeicListeningParts} · {t("toeicListeningDetails")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600 opacity-70 transition-transform group-hover/item:translate-x-0.5 group-hover/item:opacity-100 dark:text-emerald-400" />
                </Link>

                <Link
                  href={withLocale("/learn/cert/toeic/reading")}
                  className="group/item flex items-center justify-between rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-300">
                        {toeicReadingLabel}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {toeicReadingParts} · {t("toeicReadingDetails")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600 opacity-70 transition-transform group-hover/item:translate-x-0.5 group-hover/item:opacity-100 dark:text-emerald-400" />
                </Link>

                <Link
                  href={withLocale("/learn/cert/toeic/writing")}
                  className="group/item flex items-center justify-between rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-3 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <FilePenLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground group-hover/item:text-emerald-700 dark:group-hover/item:text-emerald-300">
                        {toeicWritingLabel}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        {toeicWritingParts} · {t("toeicWritingDetails")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-emerald-600 opacity-70 transition-transform group-hover/item:translate-x-0.5 group-hover/item:opacity-100 dark:text-emerald-400" />
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3.5 dark:border-emerald-900/70 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-emerald-800 sm:flex-nowrap dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Target className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{t("toeicStructureBadge")}</span>
                  </span>
                  <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow-2xs dark:bg-emerald-900 dark:text-emerald-200">
                    {t("toeicFullTestDetails")}
                  </span>
                </div>
                <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{t("toeicPracticePartsDetails")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{t("toeicFeatureDetails")}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={withLocale("/learn/cert/toeic")}
                  className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:min-h-11 sm:text-sm"
                >
                  <span className="truncate">{t("openToeic")}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t("todayOverview")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="border-border/80 bg-card shadow-xs group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:shadow-md sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400 sm:h-9 sm:w-9">
                  <RotateCw className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground min-w-0 flex-1 text-xs font-medium leading-tight">
                  {t("dueWords")}
                </span>
              </div>
              <div className="text-foreground mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-2xl">
                {topicsT("wordCount", {
                  count: dashboard.overview.dueWords,
                })}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:shadow-md sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400 sm:h-9 sm:w-9">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground min-w-0 flex-1 text-xs font-medium leading-tight">
                  {t("remainingLessons")}
                </span>
              </div>
              <div className="text-foreground mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-2xl">
                {t("lessonsCount", { count: remainingLessons })}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:shadow-md sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 sm:h-9 sm:w-9">
                  <Compass className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground min-w-0 flex-1 text-xs font-medium leading-tight">
                  {t("unlockedLevelsLabel")}
                </span>
              </div>
              <div className="text-foreground mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-2xl">
                {unlockedLevels.length}/{cefrSummary.levels.length}
              </div>
            </div>

            <div className="border-border/80 bg-card shadow-xs group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:shadow-md sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-800 dark:bg-rose-950/50 sm:h-9 sm:w-9">
                  <Target className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground min-w-0 flex-1 text-xs font-medium leading-tight">
                  {t("learnedWords")}
                </span>
              </div>
              <div className="text-foreground mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-2xl">
                {topicsT("wordCount", { count: learnedWords })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </FeedWrapper>
  );
}
