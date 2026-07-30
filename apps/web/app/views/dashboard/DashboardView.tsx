"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Clock3,
  Lock,
  Heart,
  AlertTriangle,
  Target,
  LayoutDashboard,
} from "lucide-react";

import { DashboardPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import {
  formatActivityWeekday,
  summarizeWeeklyActivity,
} from "@/app/features/dashboard/dashboard-presentation";
import { useDashboard } from "@/app/features/dashboard/hooks/use-dashboard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useDailyReviewSummary } from "@/app/features/review/hooks/use-review";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

const deckStyles = {
  A1: {
    card: "border-emerald-100 dark:border-emerald-950/20 bg-card hover:border-emerald-200 dark:hover:border-emerald-800/40",
    badgeLvl:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    barSpan:
      "bg-gradient-to-r from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500",
    accentGlow: "rgba(16, 185, 129, 0.08)",
  },
  A2: {
    card: "border-blue-100 dark:border-blue-950/20 bg-card hover:border-blue-200 dark:hover:border-blue-800/40",
    badgeLvl: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    barSpan:
      "bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500",
    accentGlow: "rgba(59, 130, 246, 0.08)",
  },
  B1: {
    card: "border-amber-100 dark:border-amber-950/20 bg-card hover:border-amber-200 dark:hover:border-amber-800/40",
    badgeLvl:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    barSpan:
      "bg-gradient-to-r from-amber-500 to-amber-400 dark:from-amber-600 dark:to-amber-500",
    accentGlow: "rgba(245, 158, 11, 0.08)",
  },
  B2: {
    card: "border-purple-100 dark:border-purple-950/20 bg-card hover:border-purple-200 dark:hover:border-purple-800/40",
    badgeLvl:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    barSpan:
      "bg-gradient-to-r from-purple-500 to-purple-400 dark:from-purple-600 dark:to-purple-500",
    accentGlow: "rgba(139, 92, 246, 0.08)",
  },
} as const;

const getPercent = (value: number, total: number) => {
  return total === 0 ? 0 : Math.round((value / total) * 100);
};

export function DashboardView() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const dashboardQuery = useDashboard();
  const dailyReviewQuery = useDailyReviewSummary();

  const userProgress = userProgressQuery.data;
  const dashboard = dashboardQuery.data;
  const dailyReview = dailyReviewQuery.data;
  const isLoading =
    userProgressQuery.isLoading ||
    dashboardQuery.isLoading ||
    dailyReviewQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse || !dashboard || !dailyReview) {
    return <DashboardPageSkeleton />;
  }

  const activeLevel =
    dashboard.levelProgress.find((level) => level.learned < level.total) ??
    dashboard.levelProgress[dashboard.levelProgress.length - 1];
  const weeklyActivity = summarizeWeeklyActivity(dashboard.activity);

  return (
    <div className="w-full">
      <div className="w-full">
        <FeedWrapper>
          <div className="flex w-full flex-col pb-12">
            <header className="mb-7 max-w-2xl">
              <p className="eyebrow text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider text-xs uppercase inline-flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>{t("eyebrow")}</span>
              </p>
              <h1 className="text-foreground mt-2 text-3xl font-semibold sm:text-4xl">
                {t("title")}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-[65ch] text-base leading-relaxed">
                {t("description")}
              </p>
            </header>

            <section className="from-brand-deep via-brand-dark to-brand shadow-brand relative mb-5 overflow-hidden rounded-lg bg-gradient-to-br p-6 text-white sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("recommended.eyebrow")}
                </div>
                <h2 className="max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
                  {t("recommended.due.title")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                  {t("recommended.due.description", { count: dailyReview.due })}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    className="text-brand-deep bg-white shadow-lg hover:bg-white/90"
                  >
                    <Link href={withLocale("/review")}>
                      {t("recommended.due.cta")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-white/75">
                    <Flame
                      className="h-4 w-4 text-amber-300"
                      aria-hidden="true"
                    />
                    {dailyReview.due} {t("recommended.breakdown.due")}
                  </span>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full border-[36px] border-white/5" />
            </section>

            {/* Your review queues */}
            <section className="mt-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-foreground text-xl font-semibold">
                    {t("reviewQueuesTitle")}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("reviewQueuesSub")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Due Card */}
                <div className="bg-card hover:shadow-lift group relative flex flex-col rounded-2xl border border-rose-100 p-5 transition duration-200 hover:-translate-y-0.5">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-rose-500/10 opacity-50 blur-2xl transition-opacity group-hover:opacity-75" />
                  <div className="relative z-10 mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                      {t("queues.due.pill")}
                    </span>
                  </div>
                  <h3 className="text-foreground relative z-10 text-base font-semibold">
                    {t("queues.due.title")}
                  </h3>
                  <p className="text-muted-foreground relative z-10 mt-2 min-h-[48px] text-xs leading-relaxed">
                    {t("queues.due.desc")}
                  </p>
                  <div className="relative z-10 mt-6 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold leading-none text-rose-600">
                      {dailyReview.due}
                    </span>
                    <span className="text-muted-foreground text-xs font-semibold">
                      {t("queues.due.countText", { count: "" })
                        .replace("{count}", "")
                        .trim()}
                    </span>
                  </div>
                  <div className="relative z-10 mt-5">
                    <Button
                      asChild
                      className="flex h-auto w-fit items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-600"
                    >
                      <Link href={withLocale("/review")}>
                        {t("queues.due.cta")}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Saved Card */}
                <div className="bg-card hover:shadow-lift group relative flex flex-col rounded-2xl border border-blue-100 p-5 transition duration-200 hover:-translate-y-0.5">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/10 opacity-50 blur-2xl transition-opacity group-hover:opacity-75" />
                  <div className="relative z-10 mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                      <Heart className="h-5 w-5 fill-blue-500" />
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                      {t("queues.saved.pill")}
                    </span>
                  </div>
                  <h3 className="text-foreground relative z-10 text-base font-semibold">
                    {t("queues.saved.title")}
                  </h3>
                  <p className="text-muted-foreground relative z-10 mt-2 min-h-[48px] text-xs leading-relaxed">
                    {t("queues.saved.desc")}
                  </p>
                  <div className="relative z-10 mt-6 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold leading-none text-blue-600">
                      {dashboard.overview.savedWords}
                    </span>
                    <span className="text-muted-foreground text-xs font-semibold">
                      {t("queues.saved.countText", { count: "" })
                        .replace("{count}", "")
                        .trim()}
                    </span>
                  </div>
                  <div className="relative z-10 mt-5">
                    <Button
                      asChild
                      className="flex h-auto w-fit items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600"
                    >
                      <Link href={withLocale("/flashcards/session?deck=saved")}>
                        {t("queues.saved.cta")}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Weak Card */}
                <div className="bg-card hover:shadow-lift group relative flex flex-col rounded-2xl border-2 border-orange-200 p-5 shadow-[0_0_0_3px_rgba(249,115,22,0.04)] transition duration-200 hover:-translate-y-0.5">
                  <div className="bg-orange-500/12 pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-85" />
                  <div className="relative z-10 mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                      {t("queues.weak.pill")}
                    </span>
                  </div>
                  <h3 className="text-foreground relative z-10 text-base font-semibold">
                    {t("queues.weak.title")}
                  </h3>
                  <p className="text-muted-foreground relative z-10 mt-2 min-h-[48px] text-xs leading-relaxed">
                    {t("queues.weak.desc")}
                  </p>
                  <div className="relative z-10 mt-6 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold leading-none text-orange-500">
                      {dashboard.overview.weakWords}
                    </span>
                    <span className="text-muted-foreground text-xs font-semibold">
                      {t("queues.weak.countText", { count: "" })
                        .replace("{count}", "")
                        .trim()}
                    </span>
                  </div>
                  <div className="relative z-10 mt-5">
                    <Button
                      asChild
                      className="flex h-auto w-fit items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-orange-600"
                    >
                      <Link href={withLocale("/practice/weak-words")}>
                        {t("queues.weak.cta")}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {(() => {
              const activeLevelIndex = dashboard.levelProgress.findIndex(
                (level) => level.level === activeLevel?.level
              );
              const totalWordsCount = dashboard.levelProgress.reduce(
                (sum, level) => sum + level.total,
                0
              );

              return (
                <>
                  <section className="mt-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-foreground text-xl font-semibold">
                          {t("cefrProgress")}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t("cefrDescription")}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-sm font-semibold">
                        {t("totalWordsCount", {
                          count: totalWordsCount.toLocaleString(),
                        })}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {dashboard.levelProgress.map((level, index) => {
                        const isLocked = index > activeLevelIndex;
                        const isCompleted =
                          level.mastered === level.total && level.total > 0;
                        const masteredPercent = getPercent(
                          level.mastered,
                          level.total
                        );
                        const style = deckStyles[level.level];

                        const cardTitle = t(`levelNames.${level.level}`);
                        const cardDesc =
                          level.level === "A1"
                            ? t("levelDescriptions.A1", { count: level.total })
                            : t(`levelDescriptions.${level.level}`);

                        const CardContent = (
                          <div className="relative z-10 flex h-full flex-col">
                            {/* Card Top */}
                            <div className="mb-4 flex items-center justify-between">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-extrabold",
                                  style.badgeLvl
                                )}
                              >
                                <BookOpen
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {level.level}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-bold",
                                  level.due > 0
                                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {level.due > 0
                                  ? t("dueText", { count: level.due })
                                  : t("dueZeroText")}
                              </span>
                            </div>

                            {/* Card Title & Desc */}
                            <h3 className="text-foreground text-lg font-semibold tracking-tight">
                              {cardTitle}
                            </h3>
                            <div className="text-muted-foreground mt-0.5 min-h-[1.5rem] text-xs">
                              {cardDesc}
                            </div>

                            {/* Card Progress */}
                            <div className="mt-4">
                              <div className="text-muted-foreground mb-1.5 flex justify-between text-xs">
                                <span>
                                  <strong className="text-foreground font-semibold">
                                    {level.mastered.toLocaleString()} /{" "}
                                    {level.total.toLocaleString()}
                                  </strong>{" "}
                                  {t("masteredLabel")}
                                </span>
                                <span>{masteredPercent}%</span>
                              </div>
                              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    style.barSpan
                                  )}
                                  style={{ width: `${masteredPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="text-muted-foreground mt-4 flex items-center justify-between text-xs font-semibold">
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5">
                                  <BookOpen
                                    className="text-muted-foreground h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  {level.total.toLocaleString()}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Flame
                                    className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                                    aria-hidden="true"
                                  />
                                  {level.mastered.toLocaleString()}
                                </span>
                              </div>
                              <span className="flex items-center gap-1">
                                {isLocked ? (
                                  <>
                                    <Lock
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    {t("lockedText")}
                                  </>
                                ) : isCompleted ? (
                                  t("reviewText")
                                ) : (
                                  t("continueText")
                                )}
                              </span>
                            </div>
                          </div>
                        );

                        if (isLocked) {
                          return (
                            <div
                              key={level.level}
                              className="bg-card border-muted relative cursor-not-allowed overflow-hidden rounded-2xl border p-5 opacity-65"
                            >
                              <div
                                className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-30 blur-2xl"
                                style={{ backgroundColor: style.accentGlow }}
                              />
                              {CardContent}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={level.level}
                            href={withLocale("/learn")}
                            className={cn(
                              "hover:shadow-lift group relative block overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5",
                              style.card
                            )}
                          >
                            <div
                              className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-75"
                              style={{ backgroundColor: style.accentGlow }}
                            />
                            {CardContent}
                          </Link>
                        );
                      })}
                    </div>
                  </section>

                  {/* Weekly activity + learning overview */}
                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                    {/* Weekly activity */}
                    <div
                      className="shadow-panel relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-5 sm:flex-row sm:items-center sm:p-6"
                      title={t("streakTimeZone")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl text-white shadow-md">
                          <Flame className="h-7 w-7" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-amber-900">
                            {t("currentStreak", {
                              count: dashboard.streak.currentStreak,
                            })}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-amber-800">
                            {t("longestStreak", {
                              count: dashboard.streak.longestStreak,
                            })}
                          </p>
                          <p className="mt-1 text-xs text-amber-700">
                            {t("weeklyReviewedWords", {
                              count: weeklyActivity.reviewedWords,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 self-center">
                        {dashboard.activity.map((day, idx) => {
                          const isToday = idx === dashboard.activity.length - 1;
                          const isActive = day.sessionCount > 0;
                          const letter = formatActivityWeekday(
                            day.date,
                            locale
                          );

                          return (
                            <div
                              key={day.date}
                              className={cn(
                                "flex h-10 w-7 flex-col items-center justify-center rounded-lg text-xs font-bold transition-all",
                                isActive
                                  ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm"
                                  : "border border-amber-200/30 bg-white/60 text-amber-800",
                                isToday &&
                                "ring-2 ring-orange-500 ring-offset-2 ring-offset-orange-50"
                              )}
                              title={t("activityDayTitle", {
                                count: day.wordCount,
                                date: day.date,
                              })}
                            >
                              <span>{letter}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Learning overview */}
                    <div className="surface-panel shadow-panel flex flex-col justify-between p-5 sm:p-6">
                      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        {t("learningOverviewTitle")}
                      </h3>
                      <div className="mt-4 grid gap-3.5">
                        {/* Cards reviewed */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-semibold leading-snug">
                                {t("cardsReviewedLabel")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {t("cardsReviewedSub")}
                              </p>
                            </div>
                          </div>
                          <span className="text-foreground tabular text-xl font-semibold">
                            {dashboard.overview.totalReviews}
                          </span>
                        </div>

                        {/* Accuracy */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                              <Target className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-semibold leading-snug">
                                {t("accuracyLabel")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {t("accuracySub")}
                              </p>
                            </div>
                          </div>
                          <span className="text-foreground tabular text-xl font-semibold">
                            {dashboard.overview.accuracy}%
                          </span>
                        </div>

                        {/* XP earned */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                              <Flame className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-semibold leading-snug">
                                {t("xpEarnedLabel")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {t("xpEarnedSub")}
                              </p>
                            </div>
                          </div>
                          <span className="text-foreground tabular text-xl font-semibold">
                            +{userProgress.points}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Top Weak Words Section - Refactored according to Design v2 */}
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr]">
              <section className="shadow-panel relative overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/30 p-5 sm:p-6 dark:border-amber-900/40 dark:bg-amber-950/10">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("weakQueueTag")}
                    </div>
                    <h2 className="text-foreground mt-1 text-xl font-semibold">
                      {t("topWeakWords")}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t("topWeakWordsDescription")}
                    </p>
                  </div>

                  {dashboard.topWeakWords.length > 0 && (
                    <Button
                      asChild
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                    >
                      <Link href={withLocale("/flashcards/session?deck=weak")}>
                        {t("weakQueueCta")}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>

                {dashboard.topWeakWords.length === 0 ? (
                  <div className="dark:bg-card/40 rounded-xl border border-dashed border-amber-200/80 bg-white/70 p-6 text-center shadow-sm dark:border-amber-900/40">
                    <p className="text-foreground font-semibold">
                      {t("noWeakWords")}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-sm">
                      {t("noWeakWordsDescription")}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {dashboard.topWeakWords.map((word) => (
                      <div
                        key={word.id}
                        className="bg-card hover:shadow-lift group relative flex flex-col justify-between rounded-xl border border-amber-100 p-4 transition duration-200 hover:-translate-y-0.5 dark:border-amber-900/30"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-foreground text-base font-semibold">
                                {word.word}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {word.meaning} ·{" "}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {word.cefrLevel}
                                </span>
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                              {t("wrongCount", { count: word.wrongCount })}
                            </span>
                          </div>

                          <div className="mt-3.5">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">
                                {t("wordAccuracy", { accuracy: word.accuracy })}
                              </span>
                              <span className="text-foreground font-semibold">
                                {word.accuracy}%
                              </span>
                            </div>
                            <Progress
                              value={word.accuracy}
                              className="h-1.5 bg-amber-100/60 dark:bg-amber-950/40"
                            />
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-center justify-end border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          <Link
                            href={withLocale("/flashcards/session?deck=weak")}
                            className="inline-flex items-center text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                          >
                            {t("reviewWord")} →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
}
