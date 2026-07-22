"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronUp, Lock, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { LearnLevelPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Unit } from "@/app/features/courses/components/Unit";
import { useLearn } from "@/app/features/courses/hooks/use-learn";
import { useUnits } from "@/app/features/courses/hooks/use-units";
import { useCourseProgress, useLessonPercentage, useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type LearnLevelViewProps = {
  onSelectMode?: (mode: "learn" | "certs" | "topics") => void;
};

function getCefrModuleTitle(index: number): string {
  const lessonNum = index + 1;
  if (lessonNum <= 10) return "Mô-đun 1 · Khởi động";
  if (lessonNum <= 20) return "Mô-đun 2 · Tăng tốc";
  if (lessonNum <= 30) return "Mô-đun 3 · Bứt phá";
  if (lessonNum <= 40) return "Mô-đun 4 · Nâng cao";
  return "Mô-đun 5 · Về đích";
}

export function LearnLevelView({ onSelectMode }: LearnLevelViewProps) {
  const nav = useTranslations("navigation");
  const topicsT = useTranslations("topics");
  const router = useRouter();
  const locale = useCurrentLocale();
  const unitsQuery = useUnits();
  const courseProgressQuery = useCourseProgress();
  const userProgressQuery = useUserProgress();
  const lessonPercentageQuery = useLessonPercentage();

  const [showAllLessons, setShowAllLessons] = useState(false);

  const units = unitsQuery.data ?? [];
  const courseProgress = courseProgressQuery.data;
  const userProgress = userProgressQuery.data;
  const lessonPercentage = lessonPercentageQuery.data ?? 0;

  const { t, unlockedUnitIds, activeUnitId, selectedUnit, getCefrLevel } =
    useLearn({ units, courseProgress: courseProgress ?? {} });

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
    return <LearnLevelPageSkeleton />;
  }

  const selectedLevel = selectedUnit ? getCefrLevel(selectedUnit.title) : null;
  const selectedTitle = selectedLevel
    ? t(`levels.${selectedLevel}.title`)
    : selectedUnit?.title ?? userProgress.activeCourse?.title ?? t("courseTitle");
  const selectedDescription = selectedLevel
    ? t(`levels.${selectedLevel}.description`)
    : selectedUnit?.description ?? t("description");

  const activeLessonId = courseProgress.activeLesson?.id;
  const lessons = selectedUnit?.lessons ?? [];
  const activeLessonIdx = lessons.findIndex((l) => l.id === activeLessonId);
  const safeActiveIdx = activeLessonIdx >= 0 ? activeLessonIdx : 0;
  const activeLessonNum = safeActiveIdx + 1;
  const totalLessons = lessons.length;
  const activeLessonObj = lessons[safeActiveIdx];
  const activeLessonTitle = activeLessonObj?.title || `Bài ${activeLessonNum}`;
  const currentModuleTitle = getCefrModuleTitle(safeActiveIdx);
  const currentLevel = selectedLevel ?? "A1";

  return (
    <FeedWrapper>
      <div className="pb-12">
        {/* Interactive Back / Breadcrumb */}
        <div className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium">
          <Link
            href={withLocale("/learn")}
            className="group inline-flex items-center gap-1 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 px-2.5 -ml-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{topicsT("byLevel")}</span>
        </div>

        {/* Header */}
        <header className="mb-7 max-w-2xl">
          <p className="eyebrow text-blue-600 dark:text-blue-400 font-medium tracking-wider text-xs uppercase">— {topicsT("exploreByLevel")}</p>
          <h1 className="mt-2.5 text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
            {topicsT("levelTitle")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {topicsT("levelDescription")}
          </p>
        </header>

        <DiscoveryTabs active="learn" levelCount={units.length || 6} onSelectMode={onSelectMode} />

        {/* Section: CẤP ĐỘ */}
        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow text-xs uppercase tracking-wider font-medium text-blue-600 dark:text-blue-400">6 CẤP ĐỘ · 3 ĐANG MỞ</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">
                Tổng 2,847 từ trong hệ thống
              </h3>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { code: "A1", name: "Sơ cấp A1", desc: "867 từ cơ bản · dùng hàng ngày", total: 867, defaultPercent: 28, unlocked: true },
              { code: "A2", name: "Sơ cấp A2", desc: "920 từ · giao tiếp cơ bản", total: 920, defaultPercent: 0, unlocked: true },
              { code: "B1", name: "Trung cấp B1", desc: "🔒 Mở khi đạt 80% A2 (736/920 từ)", total: 1100, defaultPercent: 0, unlocked: false },
              { code: "B2", name: "Trung cấp B2", desc: "🔒 Mở khi đạt 80% B1", total: 1250, defaultPercent: 0, unlocked: false },
              { code: "C1", name: "Cao cấp C1", desc: "🔒 Mở khi đạt 80% B2", total: 1400, defaultPercent: 0, unlocked: false },
              { code: "C2", name: "Thành thạo C2", desc: "🔒 Mở khi đạt 80% C1", total: 1310, defaultPercent: 0, unlocked: false },
            ].map((lvl, index) => {
              const unitItem = units.find((u) => getCefrLevel(u.title) === lvl.code) ?? units[index];
              const active = unitItem ? unitItem.id === activeUnitId : index === 0;
              const locked = unitItem ? !unlockedUnitIds.has(unitItem.id) : !lvl.unlocked;

              const completedCount = unitItem
                ? unitItem.lessons.filter((l) => l.completed).length
                : 0;
              const percent = unitItem && unitItem.lessons.length
                ? Math.round((completedCount / unitItem.lessons.length) * 100)
                : active
                  ? lvl.defaultPercent
                  : 0;

              const learnedWords = unitItem
                ? completedCount * 15
                : active
                  ? 142
                  : 0;

              return (
                <div
                  key={lvl.code}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl bg-card p-5 transition-all duration-200 min-h-[185px]",
                    active ? "border-2 border-blue-500 shadow-sm" : "border border-border/80 shadow-xs",
                    locked
                      ? "opacity-65 cursor-not-allowed"
                      : "hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-blue-400"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center font-semibold text-lg border shadow-xs",
                        active
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : !locked
                            ? "bg-muted text-foreground border-border/60"
                            : "bg-muted text-muted-foreground border-border/40"
                      )}>
                        {lvl.code}
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
                        active
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200"
                          : !locked
                            ? "bg-muted text-muted-foreground border-border/50"
                            : "bg-muted/80 text-muted-foreground border-border/40"
                      )}>
                        {!locked ? `${percent}%` : <Lock className="h-3 w-3" />}
                      </span>
                    </div>

                    <h4 className="mt-3 text-lg font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {lvl.name}
                    </h4>
                    <p className={cn("mt-1 text-xs line-clamp-1", locked ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground")}>
                      {lvl.desc}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                      <span className="tabular text-muted-foreground">
                        <strong className="text-foreground">{learnedWords}</strong> / {lvl.total} thuộc
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
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
                    {!locked ? (
                      unitItem ? (
                        <Link
                          href={withLocale(`/learn?unit=${unitItem.id}`)}
                          className={cn(
                            "w-full inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition shadow-xs",
                            active
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 hover:bg-blue-100"
                          )}
                        >
                          {active ? `Tiếp tục ${lvl.code} →` : `Bắt đầu ${lvl.code} →`}
                        </Link>
                      ) : (
                        <div className="w-full inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
                          {`Tiếp tục ${lvl.code} →`}
                        </div>
                      )
                    ) : (
                      <div className="w-full inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-muted text-xs font-bold text-muted-foreground border border-border/60">
                        <Lock className="h-3.5 w-3.5" /> Khóa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: BÀI HỌC ĐANG HỌC (Hero Active Lesson Banner matching Screenshot) */}
        {selectedUnit && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                  BÀI HỌC {currentLevel} · ĐANG HỌC
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  Bài {activeLessonNum} · {currentModuleTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowAllLessons((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
              >
                {showAllLessons ? (
                  <>
                    Thu gọn bài học <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Xem tất cả {totalLessons} bài →
                  </>
                )}
              </button>
            </div>

            {/* Blue Active Hero Card */}
            <div className="group rounded-2xl border-2 border-blue-500 bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    BÀI {activeLessonNum} / {totalLessons} · {currentLevel}
                  </div>
                  <h4 className="text-lg font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                    {activeLessonTitle}
                  </h4>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                    <span>📚 12 từ</span>
                    <span>⏱ ~12 phút</span>
                  </div>
                </div>
              </div>

              <Link
                href={withLocale("/lesson")}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-xs transition hover:bg-blue-700 shrink-0"
              >
                Tiếp tục →
              </Link>
            </div>

            {/* Collapsible Full Lessons Tree */}
            {showAllLessons && (
              <div className="mt-6 animate-page-enter">
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
