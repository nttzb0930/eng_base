"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  Headphones,
  Keyboard,
  Flame,
  Clock3,
  Target,
} from "lucide-react";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { useDashboard } from "@/app/features/dashboard/hooks/use-dashboard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useDailyReviewSummary } from "@/app/features/review/hooks/use-review";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

const overviewCards = [
  {
    key: "learnedWords",
    labelKey: "learnedWords",
    Icon: BookOpen,
    className: "border-sky-100 bg-sky-50 text-sky-600",
  },
  {
    key: "masteredWords",
    labelKey: "masteredWords",
    Icon: CheckCircle2,
    className: "border-emerald-100 bg-emerald-50 text-emerald-600",
  },
  {
    key: "dueWords",
    labelKey: "dueWords",
    Icon: CalendarClock,
    className: "border-rose-100 bg-rose-50 text-rose-600",
  },
  {
    key: "weakWords",
    labelKey: "weakWords",
    Icon: Brain,
    className: "border-amber-100 bg-amber-50 text-amber-600",
  },
] as const;

const getPercent = (value: number, total: number) => {
  return total === 0 ? 0 : Math.round((value / total) * 100);
};

const getLevelDescriptionKey = (level: string) => {
  return `recommended.continueLevel.descriptions.${level}` as const;
};

const getModeLabelKey = (mode: string) => {
  return `modes.${mode}` as const;
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
    return <ListPageSkeleton />;
  }

  const activeLevel =
    dashboard.levelProgress.find((level) => level.learned < level.total) ??
    dashboard.levelProgress[dashboard.levelProgress.length - 1];
  const activeLevelPercent = activeLevel
    ? getPercent(activeLevel.learned, activeLevel.total)
    : 0;
  const primaryActions = [
    {
      key: "due",
      Icon: CalendarClock,
      href: "/review",
      title: t("recommended.due.title"),
      description: t("recommended.due.description", {
        count: dailyReview.total,
      }),
      cta: t("recommended.due.cta"),
      className: "border-rose-200 bg-rose-50 text-rose-600",
    },
    {
      key: "weak",
      Icon: Brain,
      href: "/practice/weak-words",
      title: t("recommended.weak.title"),
      description: t("recommended.weak.description", {
        count: dashboard.overview.weakWords,
      }),
      cta: t("recommended.weak.cta"),
      className: "border-orange-200 bg-orange-50 text-orange-500",
    },
    {
      key: "continue",
      Icon: Target,
      href: "/learn",
      title: t("recommended.continueLevel.title", {
        level: activeLevel?.level ?? "A1",
      }),
      description: t(
        getLevelDescriptionKey(activeLevel?.level ?? "A1"),
        {
          learned: activeLevel?.learned ?? 0,
          total: activeLevel?.total ?? 0,
        }
      ),
      cta: t("recommended.continueLevel.cta", {
        percent: activeLevelPercent,
      }),
      className: "border-green-200 bg-green-50 text-green-600",
    },
  ] as const;
  const practiceActions = [
    {
      key: "fillBlank",
      Icon: Dumbbell,
      href: "/practice?mode=fill-blank",
      title: t("recommended.fillBlank.title"),
      description: t("recommended.fillBlank.description"),
    },
    {
      key: "listening",
      Icon: Headphones,
      href: "/practice?mode=listening",
      title: t("recommended.listening.title"),
      description: t("recommended.listening.description"),
    },
    {
      key: "dictation",
      Icon: Keyboard,
      href: "/practice?mode=dictation",
      title: t("recommended.dictation.title"),
      description: t("recommended.dictation.description"),
    },
  ] as const;
  const reviewBreakdown = [
    {
      key: "total",
      value: dailyReview.total,
      label: t("recommended.breakdown.total"),
      className: "bg-green-50 text-green-600",
    },
    {
      key: "due",
      value: dailyReview.due,
      label: t("recommended.breakdown.due"),
      className: "bg-rose-50 text-rose-600",
    },
    {
      key: "weak",
      value: dailyReview.weak,
      label: t("recommended.breakdown.weak"),
      className: "bg-orange-50 text-orange-500",
    },
    {
      key: "saved",
      value: dailyReview.saved,
      label: t("recommended.breakdown.saved"),
      className: "bg-sky-50 text-sky-500",
    },
  ] as const;
  const maxActivityWords = Math.max(
    1,
    ...dashboard.activity.map((day) => day.wordCount)
  );

  return (
    <div className="w-full">
      <div className="w-full">
        <FeedWrapper>
          <div className="flex w-full flex-col pb-12">
            <header className="mb-7 max-w-2xl">
              <p className="eyebrow">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
                {t("description")}
              </p>
            </header>

            <section className="relative mb-5 overflow-hidden rounded-lg bg-gradient-to-br from-brand-deep via-brand-dark to-brand p-6 text-white shadow-brand sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("recommended.eyebrow")}
                </div>
                <h2 className="max-w-xl text-2xl font-bold leading-tight sm:text-3xl">
                  {t("recommended.due.title")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                  {t("recommended.due.description", { count: dailyReview.total })}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild className="bg-white text-brand-deep shadow-lg hover:bg-white/90">
                    <Link href={withLocale("/review")}>
                      {t("recommended.due.cta")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-white/75">
                    <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    {dailyReview.total} {t("recommended.breakdown.total")}
                  </span>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full border-[36px] border-white/5" />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("eyebrow")}>
              {overviewCards.map((card) => {
                const Icon = card.Icon;
                const value = dashboard.overview[card.key];

                return (
                  <div
                    key={card.key}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                      card.className
                    )}
                  >
                    <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-current/10">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="tabular text-3xl font-bold tracking-tight text-foreground">{value}</p>
                    <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {t(`cards.${card.labelKey}`)}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="surface-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("accuracy")}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <p className="tabular text-4xl font-bold tracking-tight text-foreground">
                    {dashboard.overview.accuracy}%
                  </p>
                  <p className="pb-1 text-sm font-medium text-muted-foreground">
                    {t("accuracyDetail", {
                      correct: dashboard.overview.correctCount,
                      wrong: dashboard.overview.wrongCount,
                    })}
                  </p>
                </div>
                <Progress
                  value={dashboard.overview.accuracy}
                  className="mt-5 h-3"
                />
              </div>

              <div className="surface-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("reviews")}
                </p>
                <p className="tabular mt-4 text-4xl font-bold tracking-tight text-foreground">
                  {dashboard.overview.totalReviews}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {t("reviewsDescription")}
                </p>
              </div>

              <div className="surface-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("savedWords")}
                </p>
                <p className="tabular mt-4 text-4xl font-bold tracking-tight text-foreground">
                  {dashboard.overview.savedWords}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {t("savedWordsDescription")}
                </p>
              </div>
            </section>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="surface-panel p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {t("activityTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("activityDescription")}
                    </p>
                  </div>
                  <Activity className="hidden h-6 w-6 text-primary sm:block" aria-hidden="true" />
                </div>

                <div className="flex h-44 items-end gap-2">
                  {dashboard.activity.map((day) => {
                    const height = Math.max(
                      8,
                      Math.round((day.wordCount / maxActivityWords) * 100)
                    );

                    return (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-28 w-full items-end rounded-lg bg-muted px-1">
                          <div
                            className="w-full rounded-md bg-primary transition-all duration-500"
                            style={{ height: `${height}%` }}
                            title={`${day.wordCount} words`}
                          />
                        </div>
                        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                          {day.date.slice(5)}
                        </p>
                        <p className="tabular text-xs font-semibold text-foreground">
                          {day.wordCount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="surface-panel p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {t("modeAccuracyTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("modeAccuracyDescription")}
                    </p>
                  </div>
                  <BarChart3 className="hidden h-6 w-6 text-sky-500 sm:block" aria-hidden="true" />
                </div>

                {dashboard.modeAccuracy.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/50 p-5 text-center">
                    <p className="font-semibold text-foreground">
                      {t("noRecentSessions")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboard.modeAccuracy.map((mode) => (
                      <div key={mode.mode}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {t(getModeLabelKey(mode.mode))}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">
                              {t("modeSessions", { count: mode.sessionCount })}
                            </p>
                          </div>
                          <p className="tabular text-sm font-semibold text-primary">
                            {mode.accuracy}%
                          </p>
                        </div>
                        <Progress value={mode.accuracy} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="surface-panel mt-6 p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {t("recentSessionsTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("recentSessionsDescription")}
                  </p>
                </div>
                <CalendarClock className="hidden h-6 w-6 text-rose-500 sm:block" aria-hidden="true" />
              </div>

              {dashboard.recentSessions.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
                  <p className="font-semibold text-foreground">
                    {t("noRecentSessions")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("noRecentSessionsDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.recentSessions.map((session) => {
                    const wordCount = session.correctCount + session.wrongCount;

                    return (
                      <div
                        key={session.id}
                        className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {t(getModeLabelKey(session.mode))}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {session.createdAt.toLocaleDateString()} · {t("sessionWords", { count: wordCount })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                            {session.correctCount} {t("correct")}
                          </span>
                          <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                            {session.wrongCount} {t("wrong")}
                          </span>
                          <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-600">
                            {t("sessionAccuracy", { accuracy: session.accuracy })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="surface-panel mt-6 p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow">
                    {t("recommended.eyebrow")}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-foreground">
                    {t("recommended.title")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("recommended.description", {
                      total: dailyReview.total,
                      due: dailyReview.due,
                      weak: dailyReview.weak,
                    })}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href={withLocale("/practice")}>{t("recommended.viewAll")}</Link>
                </Button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {reviewBreakdown.map((item) => (
                  <div
                    key={item.key}
                    className={cn("rounded-lg px-3 py-3", item.className)}
                  >
                    <p className="tabular text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold opacity-80">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {primaryActions.map((action) => {
                  const Icon = action.Icon;

                  return (
                    <Link
                      key={action.key}
                      href={withLocale(action.href)}
                      className="group flex flex-col rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                    >
                      <div
                        className={cn(
                          "mb-4 flex h-11 w-11 items-center justify-center rounded-lg border",
                          action.className
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">
                        {action.title}
                      </h3>
                      <p className="mt-2 min-h-[42px] text-sm leading-relaxed text-muted-foreground">
                        {action.description}
                      </p>
                      <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-primary">
                        {action.cta}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {practiceActions.map((action) => {
                  const Icon = action.Icon;

                  return (
                    <Link
                      key={action.key}
                      href={withLocale(action.href)}
                      className="flex items-center gap-4 rounded-xl bg-muted/70 p-4 transition hover:bg-sky-50"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-sky-500 shadow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">
                          {action.title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="surface-panel mt-6 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {t("cefrProgress")}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    {t("cefrDescription")}
                  </p>
                </div>
                <Target className="hidden h-6 w-6 text-primary sm:block" aria-hidden="true" />
              </div>

              <div className="space-y-5">
                {dashboard.levelProgress.map((level) => {
                  const learnedPercent = getPercent(level.learned, level.total);
                  const masteredPercent = getPercent(level.mastered, level.total);

                  return (
                    <div key={level.level}>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {level.level}
                          </p>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {t("levelProgress", {
                              learned: level.learned,
                              total: level.total,
                              mastered: level.mastered,
                              accuracy: level.accuracy,
                            })}
                          </p>
                        </div>
                        <p className="tabular text-sm font-semibold text-primary">
                          {learnedPercent}%
                        </p>
                      </div>
                      <Progress value={learnedPercent} className="h-3" />
                      <div
                        className="mt-1 h-1 rounded-full bg-green-500"
                        style={{ width: `${masteredPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr]">
              <section className="surface-panel p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {t("topWeakWords")}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {t("topWeakWordsDescription")}
                    </p>
                  </div>
                  <Brain className="hidden h-6 w-6 text-amber-500 sm:block" aria-hidden="true" />
                </div>

                {dashboard.topWeakWords.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
                    <p className="font-semibold text-foreground">
                      {t("noWeakWords")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("noWeakWordsDescription")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboard.topWeakWords.map((word) => (
                      <div
                        key={word.id}
                        className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {word.word}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {word.meaning} · {word.cefrLevel}
                            </p>
                          </div>
                          <p className="shrink-0 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                            {t("wrongCount", { count: word.wrongCount })}
                          </p>
                        </div>
                        <Progress value={word.accuracy} className="mt-3 h-2" />
                        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>
                            {t("wordAccuracy", { accuracy: word.accuracy })}
                          </span>
                          <Link
                            href={withLocale("/flashcards/session?deck=weak")}
                            className="font-semibold text-primary hover:text-brand-dark"
                          >
                            {t("reviewWord")}
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
