"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PracticeLevelSummary } from "@repo/shared";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Dumbbell,
  Headphones,
  Keyboard,
  Play,
  RefreshCw,
  Shuffle,
  Sparkles,
  Target,
} from "lucide-react";

import { PracticePageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { GeneralEnglishSectionNav } from "@/app/features/general-english/components/GeneralEnglishSectionNav";
import {
  useDictationPracticeSummary,
  useFillBlankPracticeSummary,
  useListeningPracticeSummary,
  useWeakWordsPracticeSummary,
} from "@/app/features/practice/hooks/use-practice";
import { PRACTICE_CEFR_LEVELS } from "@/app/features/practice/practice-level";
import {
  getPracticeModeWordCount,
  getPracticeStartHref,
  getPracticeWordCount,
  isPracticeSelectionAvailable,
  normalizePracticeLevelSelection,
  normalizePracticeMode,
  type PracticeMode,
} from "@/app/features/practice/practice-config";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type PracticeViewProps = {
  level?: string;
  mode?: string;
};
const practiceModes: Record<
  PracticeMode,
  {
    titleKey: "fillBlankTitle" | "listeningTitle" | "dictationTitle";
    descriptionKey:
      "fillBlankDescription" | "listeningDescription" | "dictationDescription";
    Icon: typeof BookOpenText;
    iconClassName: string;
  }
> = {
  "fill-blank": {
    titleKey: "fillBlankTitle",
    descriptionKey: "fillBlankDescription",
    Icon: BookOpenText,
    iconClassName: "bg-sky-50 text-sky-600",
  },
  listening: {
    titleKey: "listeningTitle",
    descriptionKey: "listeningDescription",
    Icon: Headphones,
    iconClassName: "bg-violet-50 text-violet-600",
  },
  dictation: {
    titleKey: "dictationTitle",
    descriptionKey: "dictationDescription",
    Icon: Keyboard,
    iconClassName: "bg-amber-50 text-amber-600",
  },
};

const levelDots = {
  A1: "bg-sky-500",
  A2: "bg-emerald-500",
  B1: "bg-amber-500",
  B2: "bg-rose-500",
} as const;

export function PracticeView({ level, mode }: PracticeViewProps) {
  const t = useTranslations("practice");
  const router = useRouter();
  const locale = useCurrentLocale();
  const selectedMode = normalizePracticeMode(mode);
  const selectedLevel = normalizePracticeLevelSelection(level);
  const userProgressQuery = useUserProgress();
  const fillBlankSummaryQuery = useFillBlankPracticeSummary();
  const listeningSummaryQuery = useListeningPracticeSummary();
  const dictationSummaryQuery = useDictationPracticeSummary();
  const weakWordsSummaryQuery = useWeakWordsPracticeSummary();

  const userProgress = userProgressQuery.data;
  const fillBlankSummary = fillBlankSummaryQuery.data;
  const listeningSummary = listeningSummaryQuery.data;
  const dictationSummary = dictationSummaryQuery.data;
  const weakWordsSummary = weakWordsSummaryQuery.data;
  const isLoading =
    userProgressQuery.isLoading ||
    fillBlankSummaryQuery.isLoading ||
    listeningSummaryQuery.isLoading ||
    dictationSummaryQuery.isLoading ||
    weakWordsSummaryQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/placement-test", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (
    isLoading ||
    !userProgress?.activeCourse ||
    !fillBlankSummary ||
    !listeningSummary ||
    !dictationSummary ||
    !weakWordsSummary
  ) {
    return <PracticePageSkeleton />;
  }

  const summaries = {
    "fill-blank": fillBlankSummary,
    listening: listeningSummary,
    dictation: dictationSummary,
  } satisfies Record<PracticeMode, PracticeLevelSummary>;
  const selectedSummary = summaries[selectedMode];
  const selectedModeConfig = practiceModes[selectedMode];
  const selectedWordCount = getPracticeWordCount(
    selectedSummary,
    selectedLevel
  );
  const selectionAvailable = isPracticeSelectionAvailable(
    selectedSummary,
    selectedLevel
  );
  const startHref = getPracticeStartHref({
    mode: selectedMode,
    level: selectedLevel,
    summary: selectedSummary,
  });

  return (
    <FeedWrapper>
      <div className="pb-12">
        <header className="mb-8 max-w-3xl">
          <p className="eyebrow inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Dumbbell className="h-4 w-4" />
            <span>{t("eyebrow")}</span>
          </p>
          <h1 className="text-foreground mt-2 text-3xl font-bold sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-base leading-relaxed">
            {t("description")}
          </p>
        </header>

        <GeneralEnglishSectionNav active="practice" />

        <section className="shadow-brand relative overflow-hidden rounded-lg bg-[radial-gradient(120%_150%_at_0%_0%,#10b981_0%,#047857_58%,#064e3b_100%)] p-6 text-white sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <span className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("priorityToday")}
              </span>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                {t("weakWordsReview")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                {weakWordsSummary.total > 0
                  ? t("weakWordsAvailable", {
                      total: weakWordsSummary.total,
                      due: weakWordsSummary.due,
                    })
                  : t("weakWordsEmpty")}
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/75">
                <span>
                  • {t("weakCount", { count: weakWordsSummary.total })}
                </span>
                <span>• {t("dueCount", { count: weakWordsSummary.due })}</span>
              </div>
            </div>
            {weakWordsSummary.total > 0 ? (
              <Link
                href={withLocale("/practice/weak-words")}
                className="text-brand-deep inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("startReview")}
              </Link>
            ) : (
              <span className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white/55">
                {t("noWeakWords")}
              </span>
            )}
          </div>
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section className="mt-9">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.1em]">
                {t("step", { number: 1 })}
              </p>
              <h2 className="text-foreground mt-1 text-2xl font-bold">
                {t("chooseMode")}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">{t("modeHint")}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {(
              Object.entries(practiceModes) as [
                PracticeMode,
                (typeof practiceModes)[PracticeMode],
              ][]
            ).map(([modeKey, config]) => {
              const active = selectedMode === modeKey;
              const Icon = config.Icon;
              const wordCount = getPracticeModeWordCount(summaries[modeKey]);

              return (
                <Link
                  key={modeKey}
                  href={withLocale(
                    `/practice?mode=${modeKey}&level=${selectedLevel}`
                  )}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "bg-card hover:shadow-lift relative flex min-h-56 flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5",
                    active &&
                      "border-primary bg-secondary/70 ring-primary/15 ring-2"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-xl",
                        config.iconClassName
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {active && (
                      <span className="bg-primary text-primary-foreground grid h-6 w-6 place-items-center rounded-full">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <h3 className="text-foreground mt-5 text-lg font-bold">
                    {t(config.titleKey)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-5">
                    {t(config.descriptionKey)}
                  </p>
                  <div className="text-muted-foreground mt-auto flex items-center justify-between border-t pt-4 text-xs">
                    <span>{t("availableWords")}</span>
                    <span className="tabular text-foreground font-semibold">
                      {wordCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.1em]">
                {t("step", { number: 2 })}
              </p>
              <h2 className="text-foreground mt-1 text-2xl font-bold">
                {t("chooseLevel")}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {PRACTICE_CEFR_LEVELS.map((levelOption) => {
              const levelSummary = selectedSummary[levelOption];
              const active = selectedLevel === levelOption;
              const locked =
                levelSummary.unlockedLessons === 0 || levelSummary.words === 0;

              return (
                <Link
                  key={levelOption}
                  href={
                    locked
                      ? "#"
                      : withLocale(
                          `/practice?mode=${selectedMode}&level=${levelOption}`
                        )
                  }
                  aria-disabled={locked}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "bg-card relative min-h-28 rounded-2xl border p-4 transition duration-200",
                    active &&
                      "border-primary bg-secondary/70 ring-primary/15 ring-2",
                    locked
                      ? "pointer-events-none opacity-45"
                      : "hover:shadow-lift hover:-translate-y-0.5"
                  )}
                >
                  <span
                    className={cn(
                      "absolute right-4 top-4 h-2 w-2 rounded-full",
                      levelDots[levelOption]
                    )}
                  />
                  <span className="text-foreground text-xl font-bold">
                    {levelOption}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {t("openLessons", {
                      open: levelSummary.unlockedLessons,
                      total: levelSummary.lessons,
                    })}
                  </span>
                  <span className="tabular text-foreground/75 mt-4 block text-xs font-semibold">
                    {t("wordCount", { count: levelSummary.words })}
                  </span>
                </Link>
              );
            })}

            <Link
              href={withLocale(`/practice?mode=${selectedMode}&level=mix`)}
              aria-current={selectedLevel === "mix" ? "true" : undefined}
              className={cn(
                "bg-card hover:shadow-lift relative min-h-28 rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5",
                selectedLevel === "mix" &&
                  "border-primary bg-secondary/70 ring-primary/15 ring-2"
              )}
            >
              <Shuffle
                className="text-muted-foreground absolute right-4 top-4 h-4 w-4"
                aria-hidden="true"
              />
              <span className="text-foreground text-base font-bold">
                {t("mixAll")}
              </span>
              <span className="text-muted-foreground mt-1 block text-xs">
                {t("allLevels")}
              </span>
              <span className="tabular text-foreground/75 mt-4 block text-xs font-semibold">
                {t("wordCount", {
                  count: getPracticeWordCount(selectedSummary, "mix"),
                })}
              </span>
            </Link>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.1em]">
              {t("step", { number: 3 })}
            </p>
            <h2 className="text-foreground mt-1 text-2xl font-bold">
              {t("readyToStart")}
            </h2>
          </div>

          <div className="surface-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="bg-secondary text-secondary-foreground grid h-11 w-11 shrink-0 place-items-center rounded-xl">
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-primary text-xs font-semibold uppercase tracking-[0.08em]">
                  {t("yourSelection")}
                </p>
                <p className="text-foreground mt-1 font-semibold">
                  {t(selectedModeConfig.titleKey)}
                  <span className="text-border mx-2">•</span>
                  {selectedLevel === "mix" ? t("allLevels") : selectedLevel}
                  <span className="text-border mx-2">•</span>
                  <span className="tabular text-muted-foreground font-medium">
                    {t("wordCount", { count: selectedWordCount })}
                  </span>
                </p>
              </div>
            </div>

            {selectionAvailable ? (
              <Link
                href={withLocale(startHref)}
                className="bg-primary text-primary-foreground hover:bg-brand-dark inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
              >
                {t("startPractice")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="bg-muted text-muted-foreground inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold">
                {t("selectionUnavailable")}
              </span>
            )}
          </div>
        </section>

        <div className="text-muted-foreground mt-10 flex items-center gap-2 border-t pt-6 text-xs">
          <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
          {t("progressSaved")}
        </div>
      </div>
    </FeedWrapper>
  );
}
