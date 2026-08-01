"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronUp, Lock, Play } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CefrLevel } from "@repo/shared";

import { LearnLevelPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Unit } from "@/app/features/courses/components/Unit";
import { useLearn } from "@/app/features/courses/hooks/use-learn";
import { useUnits } from "@/app/features/courses/hooks/use-units";
import {
  useCefrLevelProgress,
  useCourseProgress,
  useLessonPercentage,
  useUserProgress,
} from "@/app/features/progress/hooks/use-user-progress";
import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

function LearnLevelFeedback({
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

export function LearnLevelView() {
  const t = useTranslations("learn");
  const nav = useTranslations("navigation");
  const topicsT = useTranslations("topics");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useCurrentLocale();
  const unitsQuery = useUnits();
  const courseProgressQuery = useCourseProgress();
  const userProgressQuery = useUserProgress();
  const lessonPercentageQuery = useLessonPercentage();
  const cefrProgressQuery = useCefrLevelProgress();
  const [showAllLessons, setShowAllLessons] = useState(false);

  const units = unitsQuery.data ?? [];
  const courseProgress = courseProgressQuery.data;
  const userProgress = userProgressQuery.data;
  const lessonPercentage = lessonPercentageQuery.data ?? 0;
  const cefrSummary = cefrProgressQuery.data;
  const hasQueryError =
    unitsQuery.isError ||
    courseProgressQuery.isError ||
    userProgressQuery.isError ||
    lessonPercentageQuery.isError ||
    cefrProgressQuery.isError;
  const unlockedLevels = new Set<CefrLevel>(
    cefrSummary?.levels
      .filter((level) => level.unlocked)
      .map((level) => level.level) ?? []
  );
  const { unlockedUnitIds, activeUnitId, selectedUnit } = useLearn({
    units,
    courseProgress: courseProgress ?? {},
    unlockedLevels,
    unitParam: searchParams.get("unit") ?? undefined,
  });

  useEffect(() => {
    if (
      !hasQueryError &&
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
    hasQueryError,
    locale,
    router,
    unitsQuery.isLoading,
    userProgress,
    userProgressQuery.isLoading,
  ]);

  if (hasQueryError) {
    return (
      <LearnLevelFeedback
        title={t("dataErrorTitle")}
        description={t("dataErrorDescription")}
      />
    );
  }

  if (
    unitsQuery.isLoading ||
    courseProgressQuery.isLoading ||
    userProgressQuery.isLoading ||
    lessonPercentageQuery.isLoading ||
    cefrProgressQuery.isLoading ||
    !courseProgress ||
    !userProgress ||
    !userProgress.activeCourse
  ) {
    return <LearnLevelPageSkeleton />;
  }

  if (!cefrSummary || cefrSummary.levels.length === 0) {
    return (
      <LearnLevelFeedback
        title={t("levelsTitle")}
        description={t("noCefrData")}
      />
    );
  }

  const selectedLevel = selectedUnit?.cefrLevel;
  const selectedTitle = selectedLevel
    ? t(`levels.${selectedLevel}.title`)
    : (selectedUnit?.title ?? userProgress.activeCourse.title);
  const selectedDescription = selectedLevel
    ? t(`levels.${selectedLevel}.description`)
    : (selectedUnit?.description ?? t("description"));
  const selectedLevelProgress = cefrSummary.levels.find(
    (level) => level.level === selectedLevel
  );
  const activeLessonId = courseProgress.activeLesson?.id;
  const lessons = selectedUnit?.lessons ?? [];
  const activeLessonIndex = lessons.findIndex(
    (lesson) => lesson.id === activeLessonId
  );
  const safeActiveLessonIndex = activeLessonIndex >= 0 ? activeLessonIndex : 0;
  const activeLessonNumber = safeActiveLessonIndex + 1;
  const activeLesson = lessons[safeActiveLessonIndex];
  const activeLessonTitle =
    activeLesson?.title ?? t("lessonLabel", { number: activeLessonNumber });
  const currentLevel = selectedLevel ?? "A1";
  const unlockedCount = cefrSummary.levels.filter(
    (level) => level.unlocked
  ).length;

  return (
    <FeedWrapper>
      <div className="pb-12">
        <div className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium">
          <Link
            href={withLocale("/learn")}
            className="text-muted-foreground group -ml-2.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {topicsT("byLevel")}
          </span>
        </div>

        <header className="mb-7 max-w-2xl">
          <p className="eyebrow text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
            — {t("exploreByLevel")}
          </p>
          <h1 className="text-foreground mt-2.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("levelTitle")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-sm leading-relaxed">
            {t("levelDescription")}
          </p>
        </header>

        <DiscoveryTabs active="learn" levelCount={cefrSummary.levels.length} />

        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t("levelCountSummary", {
                  total: cefrSummary.levels.length,
                  unlocked: unlockedCount,
                })}
              </p>
              <h3 className="text-foreground mt-1 text-xl font-semibold">
                {t("totalVocabulary", { count: cefrSummary.totalWords })}
              </h3>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cefrSummary.levels.map((levelProgress, index) => {
              const levelUnits = units.filter(
                (unit) => unit.cefrLevel === levelProgress.level
              );
              const active = levelUnits.some(
                (unit) => unit.id === activeUnitId
              );
              const targetUnit =
                levelUnits.find((unit) => unit.id === activeUnitId) ??
                levelUnits[0];
              const locked =
                !levelProgress.unlocked ||
                (targetUnit ? !unlockedUnitIds.has(targetUnit.id) : false);
              const percent = levelProgress.totalWords
                ? Math.round(
                    (levelProgress.masteredWords / levelProgress.totalWords) *
                      100
                  )
                : 0;
              const previousLevel = cefrSummary.levels[index - 1]?.level;

              return (
                <div
                  key={levelProgress.level}
                  className={cn(
                    "bg-card group relative flex min-h-[205px] flex-col justify-between rounded-2xl p-5 transition-all duration-200",
                    active
                      ? "border-2 border-blue-500 shadow-sm"
                      : "border-border/80 shadow-xs border",
                    locked
                      ? "cursor-not-allowed opacity-65"
                      : "cursor-pointer hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "shadow-xs flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-semibold",
                          active
                            ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400"
                            : locked
                              ? "border-border/40 bg-muted text-muted-foreground"
                              : "border-border/60 bg-muted text-foreground"
                        )}
                      >
                        {levelProgress.level}
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
                          active
                            ? "border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                            : "border-border/50 bg-muted text-muted-foreground"
                        )}
                      >
                        {locked ? <Lock className="h-3 w-3" /> : `${percent}%`}
                      </span>
                    </div>

                    <h4 className="text-foreground mt-3 text-lg font-semibold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {t(`levels.${levelProgress.level}.title`)}
                    </h4>
                    <p
                      className={cn(
                        "mt-1 line-clamp-2 text-xs",
                        locked
                          ? "font-medium text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {locked && previousLevel
                        ? t("unlockRequirement", { level: previousLevel })
                        : t("levelWordSummary", {
                            count: levelProgress.totalWords,
                          })}
                    </p>

                    <div className="mt-4 space-y-1 text-xs font-semibold">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {t("masteredProgress", {
                            mastered: levelProgress.masteredWords,
                            total: levelProgress.totalWords,
                          })}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {t("lessonProgressSummary", {
                          completed: levelProgress.completedLessons,
                          total: levelProgress.totalLessons,
                        })}
                      </div>
                    </div>

                    <div className="bg-muted/80 mt-2 h-1.5 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          active
                            ? "bg-gradient-to-r from-blue-500 to-blue-400"
                            : "bg-blue-300"
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    {!locked && targetUnit ? (
                      <Link
                        href={withLocale(`/learn/level?unit=${targetUnit.id}`)}
                        className={cn(
                          "shadow-xs inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition",
                          active
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400"
                        )}
                      >
                        {active
                          ? t("continueLevelBtn", {
                              code: levelProgress.level,
                            })
                          : t("startLevelBtn", {
                              code: levelProgress.level,
                            })}
                      </Link>
                    ) : (
                      <div className="border-border/60 bg-muted text-muted-foreground inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-bold">
                        {locked && <Lock className="h-3.5 w-3.5" />}
                        {locked ? t("locked") : t("progressUnavailable")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {selectedUnit && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {t("activeLessonEyebrow", { level: currentLevel })}
                </p>
                <h3 className="text-foreground mt-1 text-xl font-semibold">
                  {activeLessonTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowAllLessons((previous) => !previous)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-all hover:underline dark:text-blue-400"
              >
                {showAllLessons ? (
                  <>
                    {t("collapseLessons")} <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  t("viewAllLessons", { count: lessons.length })
                )}
              </button>
            </div>

            <div className="bg-card shadow-xs group flex flex-col justify-between gap-4 rounded-2xl border-2 border-blue-500 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="shadow-xs flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {t("lessonPosition", {
                      current: activeLessonNumber,
                      total: lessons.length,
                      level: currentLevel,
                    })}
                  </div>
                  <h4 className="text-foreground mt-0.5 text-lg font-semibold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {activeLessonTitle}
                  </h4>
                  {selectedLevelProgress && (
                    <div className="text-muted-foreground mt-1 text-xs">
                      {t("lessonProgressSummary", {
                        completed: selectedLevelProgress.completedLessons,
                        total: selectedLevelProgress.totalLessons,
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Link
                href={withLocale("/lesson")}
                className="shadow-xs inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                {t("continueLearning")}
              </Link>
            </div>

            {showAllLessons && (
              <div className="animate-page-enter mt-6">
                <Unit
                  id={selectedUnit.id}
                  order={selectedUnit.order}
                  description={selectedDescription}
                  title={selectedTitle}
                  lessons={selectedUnit.lessons}
                  activeLesson={courseProgress.activeLesson}
                  activeLessonPercentage={lessonPercentage}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </FeedWrapper>
  );
}
