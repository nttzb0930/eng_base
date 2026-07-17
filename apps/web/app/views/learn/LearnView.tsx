"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, Check, LockKeyhole, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Progress } from "@/app/components/ui/progress";
import { Unit } from "@/app/features/courses/components/Unit";
import { useLearn } from "@/app/features/courses/hooks/use-learn";
import { useUnits } from "@/app/features/courses/hooks/use-units";
import { useCourseProgress, useLessonPercentage, useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";
import { withLocale } from "@/app/i18n/paths";

const levelStyles = [
  "border-sky-100 bg-sky-50 text-sky-600",
  "border-emerald-100 bg-emerald-50 text-emerald-600",
  "border-amber-100 bg-amber-50 text-amber-600",
  "border-rose-100 bg-rose-50 text-rose-600",
] as const;

export function LearnView() {
  const router = useRouter();
  const locale = useCurrentLocale();
  const searchParams = useSearchParams();
  const nav = useTranslations("navigation");
  const unitParam = searchParams.get("unit") ?? undefined;
  const unitsQuery = useUnits();
  const courseProgressQuery = useCourseProgress();
  const userProgressQuery = useUserProgress();
  const lessonPercentageQuery = useLessonPercentage();
  const units = unitsQuery.data ?? [];
  const courseProgress = courseProgressQuery.data;
  const userProgress = userProgressQuery.data;
  const lessonPercentage = lessonPercentageQuery.data ?? 0;
  const { t, unlockedUnitIds, activeUnitId, selectedUnit, getCefrLevel } =
    useLearn({ units, courseProgress: courseProgress ?? {}, unitParam });

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
    lessonPercentageQuery.isLoading ||
    !courseProgress ||
    !userProgress ||
    !userProgress.activeCourse
  ) {
    return <ListPageSkeleton />;
  }

  const selectedLevel = selectedUnit ? getCefrLevel(selectedUnit.title) : null;
  const selectedTitle = selectedLevel
    ? t(`levels.${selectedLevel}.title`)
    : selectedUnit?.title ?? userProgress.activeCourse?.title ?? t("courseTitle");
  const selectedDescription = selectedLevel
    ? t(`levels.${selectedLevel}.description`)
    : selectedUnit?.description ?? t("description");
  const selectedCompleted =
    selectedUnit?.lessons.filter((lesson) => lesson.completed).length ?? 0;
  const selectedTotal = selectedUnit?.lessons.length ?? 0;
  const selectedPercent = selectedTotal
    ? Math.round((selectedCompleted / selectedTotal) * 100)
    : 0;

  return (
    <FeedWrapper>
      <div className="pb-12">
        <header className="mb-7 max-w-2xl">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <DiscoveryTabs
          active="learn"
          learnLabel={nav("learn")}
          topicsLabel={nav("topics")}
          levelCount={units.length}
        />

        {selectedUnit && (
          <section className="relative overflow-hidden rounded-lg bg-[radial-gradient(120%_140%_at_0%_0%,#10b981_0%,#047857_55%,#064e3b_100%)] p-6 text-white shadow-brand sm:p-8">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("upNext")}
                </span>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{selectedTitle}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                  {selectedDescription}
                </p>
                <div className="mt-5 flex max-w-md items-center gap-3">
                  <Progress value={selectedPercent} className="h-1.5 bg-white/20 [&>div]:bg-white" />
                  <span className="tabular shrink-0 text-xs font-semibold text-white/80">
                    {selectedCompleted}/{selectedTotal}
                  </span>
                </div>
              </div>
              <Link
                href={withLocale("/lesson")}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-deep shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {t("continue")}
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("levelsTitle")}
            </h2>
            {selectedUnit && (
              <span className="text-sm text-muted-foreground">
                {t("lessonsAvailable", { count: selectedTotal })}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {units.map((unitItem, index) => {
              const level = getCefrLevel(unitItem.title);
              const active = unitItem.id === activeUnitId;
              const locked = !unlockedUnitIds.has(unitItem.id);
              const completedCount = unitItem.lessons.filter(
                (lesson) => lesson.completed
              ).length;
              const percent = unitItem.lessons.length
                ? Math.round((completedCount / unitItem.lessons.length) * 100)
                : 0;
              const completed = percent === 100;
              const Icon = locked ? LockKeyhole : completed ? Check : BookOpen;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-[11px] font-semibold">
                      {locked ? "â€”" : `${percent}%`}
                    </span>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                      {level ?? unitItem.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                      {level ? t(`levels.${level}.title`) : unitItem.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-foreground/75">
                    <span className="tabular">
                      {completedCount}/{unitItem.lessons.length} {t("done")}
                    </span>
                    {!locked && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </div>
                  <Progress value={percent} className="mt-2 h-1.5 bg-white/70" />
                </>
              );

              const className = cn(
                "relative block overflow-hidden rounded-2xl border p-5 transition duration-200",
                levelStyles[index % levelStyles.length],
                active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                locked
                  ? "cursor-not-allowed opacity-55 grayscale"
                  : "hover:-translate-y-0.5 hover:shadow-lift"
              );

              return locked ? (
                <div key={unitItem.id} className={className} aria-disabled="true">
                  {content}
                </div>
              ) : (
                <Link
                  key={unitItem.id}
                  href={withLocale(`/learn?unit=${unitItem.id}`)}
                  className={className}
                  aria-current={active ? "true" : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        {selectedUnit && (
          <section className="mt-8" aria-label={selectedTitle}>
            <Unit
              id={selectedUnit.id}
              order={selectedUnit.order}
              description={selectedDescription}
              title={selectedTitle}
              lessons={selectedUnit.lessons}
              activeLesson={courseProgress.activeLesson}
              activeLessonPercentage={lessonPercentage}
            />
          </section>
        )}

      </div>
    </FeedWrapper>
  );
}
