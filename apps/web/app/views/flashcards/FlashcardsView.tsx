"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bookmark,
  Brain,
  Calendar,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  Layers,
  ListFilter,
  Lock,
  Play,
  Tag,
  Target,
} from "lucide-react";

import { FlashcardsPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useFlashcardSummary } from "@/app/features/flashcards/hooks/use-flashcards";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

export function FlashcardsView() {
  const t = useTranslations("flashcards");
  const topicsT = useTranslations("topics");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const summaryQuery = useFlashcardSummary();

  const [activeTab, setActiveTab] = useState<"cefr" | "cert" | "topic">("cefr");

  const userProgress = userProgressQuery.data;
  const summary = summaryQuery.data;
  const isLoading = userProgressQuery.isLoading || summaryQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse || !summary) {
    return <FlashcardsPageSkeleton />;
  }

  const dueCount = summary.due ?? 12;
  const savedCount = summary.saved ?? 8;
  const weakCount = summary.weak ?? 6;
  const accuracy = "87%";

  return (
    <FeedWrapper>
      <div className="pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Layers className="h-3.5 w-3.5" />
              <span>{t("srsDeckLabel")}</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-2xl">
                {t("description")}
              </p>
            </div>
            <Link
              href={withLocale("/flashcards/session?deck=all")}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground shadow-xs hover:bg-muted transition-colors shrink-0"
            >
              <span>{t("createCustomDeck")}</span>
            </Link>
          </div>
        </div>

        {/* 1. Stats Strip */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-9">
          <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:border-rose-500/40 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-xs">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {dueCount}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {t("dueToday")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("dueTodayDesc")}
              </p>
            </div>
          </div>

          <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:border-sky-500/40 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-xs">
                <Bookmark className="h-6 w-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {savedCount}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {t("savedWords")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("savedWordsDesc")}
              </p>
            </div>
          </div>

          <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:border-orange-500/40 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-xs">
                <Brain className="h-6 w-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {weakCount}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                {t("weakWords")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("weakWordsDesc")}
              </p>
            </div>
          </div>

          <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <Target className="h-6 w-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {accuracy}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t("accuracy")}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t("accuracyDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Hero SRS Due Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 dark:from-emerald-900 dark:via-emerald-950 dark:to-emerald-900 p-6 sm:p-8 text-white shadow-xl mb-9">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white border border-white/20">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t("today")}</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
                  {t("wordsAwaitingReview", { count: dueCount })}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mb-6 max-w-xl">
                  {t("srsBannerSubtitle")}
                </p>

                <div className="grid grid-cols-3 gap-3 max-w-md">
                  <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-white">428</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80">
                      {t("masteredUpper")}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-white">7</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80">
                      {t("streakUpper")}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-white">{accuracy}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80">
                      {t("accuracyUpper")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:text-right shrink-0 flex flex-col items-start md:items-end justify-center">
                <Link
                  href={withLocale("/flashcards/session?deck=due")}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Play className="h-4 w-4 fill-emerald-700 text-emerald-700" />
                  <span>{t("reviewDueWordsBtn")}</span>
                </Link>
                <p className="mt-2.5 text-xs text-emerald-100/90 font-medium">
                  {t("reviewEstTime", { minutes: 5, count: dueCount })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Quick Review Cards */}
        <section className="mb-10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">{t("quickReviewTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("quickReviewSubtitle")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* SAVED */}
            <article className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600 rounded-t-2xl" />
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-xs">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    {t("wordCount", { count: savedCount })}
                  </span>
                </div>
                <h4 className="mt-4 text-base font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {t("reviewSavedWordsTitle")}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {t("reviewSavedWordsDesc")}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-border/70 pt-3 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{savedCount}</div>
                    <div className="text-[11px] text-muted-foreground">{t("savedWords")}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">5</div>
                    <div className="text-[11px] text-muted-foreground">{topicsT("mastered")}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">2h</div>
                    <div className="text-[11px] text-muted-foreground">{t("lastReviewed")}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: "62%" }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>{t("masteryRate")}</span>
                    <span>62%</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Link
                  href={withLocale("/flashcards/session?deck=saved")}
                  className="flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>{t("reviewNowBtn")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={withLocale("/saved-words")}
                  className="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t("viewSavedWordsTooltip")}
                >
                  <ListFilter className="h-4 w-4" />
                </Link>
              </div>
            </article>

            {/* WEAK */}
            <article className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-2xl" />
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-xs">
                    <Brain className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    {t("weakBadge")}
                  </span>
                </div>
                <h4 className="mt-4 text-base font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {t("reviewWeakWordsTitle")}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {t("reviewWeakWordsDesc")}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-border/70 pt-3 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{weakCount}</div>
                    <div className="text-[11px] text-muted-foreground">{t("weakWords")}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">3</div>
                    <div className="text-[11px] text-muted-foreground">{t("avgMissCount")}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">1d</div>
                    <div className="text-[11px] text-muted-foreground">{t("lastReviewed")}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: "28%" }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>{t("masteryRate")}</span>
                    <span>28%</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Link
                  href={withLocale("/flashcards/session?deck=weak")}
                  className="flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>{t("reviewNowBtn")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={withLocale("/saved-words")}
                  className="inline-flex min-h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t("viewWeakWordsTooltip")}
                >
                  <ListFilter className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* 5. Tabbed Deck Picker */}
        <section className="mb-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground tracking-tight">{t("chooseDeckTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("chooseDeckSubtitle")}
              </p>
            </div>
            <Link
              href={withLocale("/learn")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>{t("manageDecksBtn")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Filter Chips */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("cefr")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "cefr"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                  : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{t("cefrLevelsTab")}</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", activeTab === "cefr" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                4
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cert")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "cert"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                  : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{t("certificatesTab")}</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", activeTab === "cert" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                3
              </span>
            </button>

            <button
              onClick={() => setActiveTab("topic")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "topic"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                  : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{t("topicsTab")}</span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", activeTab === "topic" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                4
              </span>
            </button>
          </div>

          {/* Tab Content Grids */}
          {activeTab === "cefr" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-page-enter">
              {[
                { code: "A1", label: locale === "vi" ? "Sơ cấp A1" : "Elementary A1", desc: locale === "vi" ? "Từ vựng nhập môn & giao tiếp đời sống hàng ngày" : "Introductory vocabulary & daily conversation", percent: 28, count: summary.levels["A1"] ?? 867, locked: false },
                { code: "A2", label: locale === "vi" ? "Sơ cấp A2" : "Pre-Intermediate A2", desc: locale === "vi" ? "Từ vựng thông dụng trong các tình huống cơ bản" : "Common vocabulary for basic everyday situations", percent: 12, count: summary.levels["A2"] ?? 920, locked: false },
                { code: "B1", label: locale === "vi" ? "Trung cấp B1" : "Intermediate B1", desc: locale === "vi" ? "Mở khi đạt 80% A2 · Từ vựng diễn đạt quan điểm" : "Unlocks at 80% A2 · Opinion & discussion words", percent: 0, count: summary.levels["B1"] ?? 1810, locked: true },
                { code: "B2", label: locale === "vi" ? "Trung cấp B2" : "Upper-Intermediate B2", desc: locale === "vi" ? "Mở khi đạt 80% B1 · Từ vựng học thuật chuyên sâu" : "Unlocks at 80% B1 · Academic & professional words", percent: 0, count: summary.levels["B2"] ?? 2091, locked: true },
              ].map((deck) => (
                <Link
                  key={deck.code}
                  href={deck.locked ? "#" : withLocale(`/flashcards/session?deck=${deck.code}`)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 min-h-[165px]",
                    deck.locked
                      ? "pointer-events-none opacity-60 border-border/50 bg-muted/20"
                      : "border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-md cursor-pointer"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold text-sm border border-emerald-200 dark:border-emerald-800 shadow-xs">
                        {deck.code}
                      </div>
                      {deck.locked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> {t("locked")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {deck.percent}%
                        </span>
                      )}
                    </div>
                    <h4 className="mt-3.5 text-base font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {deck.label}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{deck.desc}</p>
                  </div>

                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${deck.percent}%` }} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400">{t("wordCount", { count: deck.count })}</span>
                      <span className="text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-0.5">
                        {deck.percent > 0 ? t("continueBtn") : t("startBtn")} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "cert" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-page-enter">
              {[
                { title: "IELTS Academic", icon: "🎓", desc: locale === "vi" ? "Từ vựng cốt lõi cho bài thi IELTS Band 6.5+" : "Core vocabulary for IELTS Band 6.5+", meta: locale === "vi" ? "428 / 1.247 từ" : "428 / 1,247 words", percent: 42, locked: false },
                { title: "TOEIC 600+", icon: "📝", desc: locale === "vi" ? "Từ vựng môi trường công sở & giao tiếp doanh nghiệp" : "Workplace & business communication vocabulary", meta: locale === "vi" ? "176 / 980 từ" : "176 / 980 words", percent: 18, locked: false },
                { title: "Business English", icon: "💼", desc: locale === "vi" ? "Thương lượng, thuyết trình & viết email thương mại" : "Negotiation, presentations & commercial email writing", meta: locale === "vi" ? "Chưa bắt đầu" : "Not started", percent: 0, fresh: true, locked: false },
                { title: "TOEFL iBT", icon: "🔒", desc: locale === "vi" ? "Mở khi đạt 70% IELTS · Từ vựng học thuật đại học" : "Unlocks at 70% IELTS · Academic university vocabulary", meta: locale === "vi" ? "Mở khóa sau" : "Unlocks later", percent: 0, locked: true },
              ].map((cert) => (
                <Link
                  key={cert.title}
                  href={cert.locked ? "#" : withLocale(`/flashcards/session?deck=${cert.title}`)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 min-h-[165px]",
                    cert.locked
                      ? "pointer-events-none opacity-60 border-border/50 bg-muted/20"
                      : "border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-md cursor-pointer"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{cert.icon}</span>
                      {cert.locked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> {t("locked")}
                        </span>
                      ) : cert.fresh ? (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-600 px-2.5 py-0.5 text-xs font-semibold">
                          {t("newBadge")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 text-sky-600 px-2.5 py-0.5 text-xs font-semibold">
                          {cert.percent}%
                        </span>
                      )}
                    </div>
                    <h4 className="mt-3.5 text-base font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {cert.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{cert.desc}</p>
                  </div>

                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${cert.percent}%` }} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400">{cert.meta}</span>
                      <span className="text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-0.5">
                        {cert.percent > 0 ? t("continueBtn") : t("startBtn")} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "topic" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-page-enter">
              {[
                { title: "Travel & Transport", icon: "✈️", desc: locale === "vi" ? "Du lịch, sân bay, khách sạn & phương tiện di chuyển" : "Travel, airport, hotel & transportation", meta: locale === "vi" ? "56 / 87 từ" : "56 / 87 words", percent: 64 },
                { title: "Food & Dining", icon: "🍜", desc: locale === "vi" ? "Ẩm thực, nhà hàng, nguyên liệu & cách chế biến" : "Cuisine, dining, ingredients & cooking", meta: locale === "vi" ? "50 / 64 từ" : "50 / 64 words", percent: 78 },
                { title: "Health & Body", icon: "🏥", desc: locale === "vi" ? "Sức khỏe, bộ phận cơ thể & khám chữa bệnh" : "Health, body parts & medical care", meta: locale === "vi" ? "8 / 45 từ · yếu" : "8 / 45 words · weak", percent: 18, weak: true },
                { title: "Technology", icon: "💻", desc: locale === "vi" ? "Công nghệ thông tin, thiết bị số & mạng xã hội" : "Information tech, digital devices & social media", meta: locale === "vi" ? "8 / 98 từ" : "8 / 98 words", percent: 8 },
              ].map((topic) => (
                <Link
                  key={topic.title}
                  href={withLocale(`/flashcards/session?deck=${topic.title}`)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 min-h-[165px]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{topic.icon}</span>
                      {topic.weak ? (
                        <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 text-orange-600 px-2.5 py-0.5 text-xs font-semibold">
                          {t("weakBadge")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-600 px-2.5 py-0.5 text-xs font-semibold">
                          {topic.percent}%
                        </span>
                      )}
                    </div>
                    <h4 className="mt-3.5 text-base font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {topic.title}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{topic.desc}</p>
                  </div>

                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${topic.percent}%` }} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400">{topic.meta}</span>
                      <span className="text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-0.5">
                        {t("continueBtn")} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
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
