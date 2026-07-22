"use client";

import { useEffect } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Flame,
  Plane,
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
import { useUnits } from "@/app/features/courses/hooks/use-units";
import { useCourseProgress, useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

export function LearnView() {
  const t = useTranslations("learn");
  const topicsT = useTranslations("topics");
  const router = useRouter();
  const locale = useCurrentLocale();

  const unitsQuery = useUnits();
  const courseProgressQuery = useCourseProgress();
  const userProgressQuery = useUserProgress();
  const courseProgress = courseProgressQuery.data;
  const userProgress = userProgressQuery.data;

  useEffect(() => {
    if (
      !unitsQuery.isLoading &&
      !courseProgressQuery.isLoading &&
      !userProgressQuery.isLoading &&
      (!courseProgress || !userProgress || !userProgress.activeCourse)
    ) {
      router.replace(withLocale("/placement-test", locale));
    }
  }, [
    courseProgress,
    courseProgressQuery.isLoading,
    locale,
    router,
    unitsQuery.isLoading,
    userProgress,
    userProgressQuery.isLoading,
  ]);

  if (
    unitsQuery.isLoading ||
    courseProgressQuery.isLoading ||
    userProgressQuery.isLoading ||
    !courseProgress ||
    !userProgress ||
    !userProgress.activeCourse
  ) {
    return <LearnPageSkeleton />;
  }

  return (
    <FeedWrapper>
      <div className="pb-12">
        {/* Header */}
        <header className="mb-7">
          <div className="eyebrow text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider text-xs uppercase inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className="mt-2.5 text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2.5 text-sm text-muted-foreground line-clamp-1">
            {t("description")}
          </p>
        </header>

        {/* Hero Review Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] dark:from-[#059669] dark:to-[#047857] p-6 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white opacity-5" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-white opacity-5" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-sm font-medium text-white border border-white/20">
                  <Calendar className="h-4 w-4" />
                  <span>{t("today")}</span>
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
                {t("wordsAwaitingReview")}
              </h2>
              <p className="max-w-xl text-sm text-emerald-100 mb-6 leading-relaxed">
                {t("reviewSubtitle")}
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-md">
                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                  <div className="text-2xl font-bold text-white">428</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    {topicsT("mastered")}
                  </div>
                </div>

                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                  <div className="text-2xl font-bold text-white">7</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    STREAK
                  </div>
                </div>

                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                  <div className="text-2xl font-bold text-white">87%</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-100">
                    {t("accuracy")}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:text-right shrink-0 flex flex-col items-start md:items-end justify-center">
              <Link
                href={withLocale("/review")}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-600 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600" aria-hidden="true" />
                <span>{t("reviewWeakWordsBtn")}</span>
              </Link>
              <p className="mt-3 text-sm text-emerald-100 font-medium">
                {t("reviewEstTime")}
              </p>
            </div>
          </div>
        </section>

        {/* 3 CÁCH HỌC */}
        <section className="mt-9">
          <div className="mb-4">
            <p className="eyebrow text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">{t("learningModes")}</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">
              {t("chooseModeTitle")}
            </h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Card 1: Theo cấp độ (Blue) */}
            <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-blue-500/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-base border border-blue-200 dark:border-blue-800">
                    A1
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    28%
                  </span>
                </div>

                <h4 className="mt-4 text-xl font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {topicsT("byLevel")}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("byLevelDesc")}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{t("learningStatusLabel")}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">A1 · 142/867 {topicsT("words").toLowerCase()}</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: "28%" }} />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("hoursAgo")}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={withLocale("/learn/level")}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white shadow-xs transition-colors"
                >
                  <span>{t("continueLevelBtn", { code: "A1" })}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Theo chứng chỉ (Emerald) */}
            <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-emerald-500/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-tight border border-emerald-200 dark:border-emerald-800">
                    IELTS
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    42%
                  </span>
                </div>

                <h4 className="mt-4 text-xl font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {topicsT("byCert")}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("byCertDesc")}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{t("learningStatusLabel")}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">IELTS · 428/1,247 {topicsT("words").toLowerCase()}</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: "42%" }} />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("hoursAgo")} · {t("activeCertsCount", { count: 3 })}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={withLocale("/learn/cert")}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-xs transition-colors"
                >
                  <span>{t("continueLevelBtn", { code: "IELTS" })}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Theo chủ đề (Amber/Orange) */}
            <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-orange-500/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffeedd] dark:bg-orange-950/60 text-[#ea580c] dark:text-orange-400">
                    <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/60 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    64%
                  </span>
                </div>

                <h4 className="mt-4 text-xl font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {topicsT("byTopic")}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("byTopicDesc")}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{t("learningStatusLabel")}</span>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">Travel · 56/87 {topicsT("words").toLowerCase()}</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: "64%" }} />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("yesterday")} · {t("activeTopicsCount", { count: 6 })}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={withLocale("/learn/topic")}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-semibold text-white shadow-xs transition-colors"
                >
                  <span>{t("continueLevelBtn", { code: "Travel" })}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* TỔNG QUAN HÔM NAY */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="eyebrow text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
              {t("todayOverview")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Review Card */}
            <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                  <RotateCw className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{t("reviewSoon")}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{topicsT("wordCount", { count: 23 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Cần ôn trong hôm nay</div>
            </div>

            {/* New Lessons Card */}
            <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{t("unlearnedLessons")}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{t("lessonsCount", { count: 5 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Sẵn sàng học mới</div>
            </div>

            {/* Active Modes Card */}
            <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{t("inProgressModes")}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{t("modesCount", { count: 3 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Đang học song song</div>
            </div>

            {/* Streak Card */}
            <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 border border-rose-200 dark:border-rose-800">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Streak</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{t("daysCount", { count: 7 })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Tiếp tục duy trì!</div>
            </div>
          </div>
        </section>
      </div>
    </FeedWrapper>
  );
}
