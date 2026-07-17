"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PracticeLevelSummary } from "@repo/shared";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Headphones,
  Keyboard,
  Play,
  RefreshCw,
  Shuffle,
  Sparkles,
  Target,
} from "lucide-react";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
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
      | "fillBlankDescription"
      | "listeningDescription"
      | "dictationDescription";
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
    return <ListPageSkeleton />;
  }

  const summaries = {
    "fill-blank": fillBlankSummary,
    listening: listeningSummary,
    dictation: dictationSummary,
  } satisfies Record<PracticeMode, PracticeLevelSummary>;
  const selectedSummary = summaries[selectedMode];
  const selectedModeConfig = practiceModes[selectedMode];
  const selectedWordCount = getPracticeWordCount(selectedSummary, selectedLevel);
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
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <section className="relative overflow-hidden rounded-lg bg-[radial-gradient(120%_150%_at_0%_0%,#10b981_0%,#047857_58%,#064e3b_100%)] p-6 text-white shadow-brand sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
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
                <span>• {t("weakCount", { count: weakWordsSummary.total })}</span>
                <span>• {t("dueCount", { count: weakWordsSummary.due })}</span>
              </div>
            </div>
            {weakWordsSummary.total > 0 ? (
              <Link
                href={withLocale("/practice/weak-words")}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-deep shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
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
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {t("step", { number: 1 })}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{t("chooseMode")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t("modeHint")}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {(Object.entries(practiceModes) as [PracticeMode, (typeof practiceModes)[PracticeMode]][]).map(
              ([modeKey, config]) => {
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
                      "relative flex min-h-56 flex-col rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                      active && "border-primary bg-secondary/70 ring-2 ring-primary/15"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn("grid h-11 w-11 place-items-center rounded-xl", config.iconClassName)}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {active && (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-foreground">{t(config.titleKey)}</h3>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{t(config.descriptionKey)}</p>
                    <div className="mt-auto flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                      <span>{t("availableWords")}</span>
                      <span className="tabular font-semibold text-foreground">{wordCount}</span>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {t("step", { number: 2 })}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{t("chooseLevel")}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {PRACTICE_CEFR_LEVELS.map((levelOption) => {
              const levelSummary = selectedSummary[levelOption];
              const active = selectedLevel === levelOption;
              const locked = levelSummary.unlockedLessons === 0 || levelSummary.words === 0;

              return (
                <Link
                  key={levelOption}
                  href={
                    locked
                      ? "#"
                      : withLocale(`/practice?mode=${selectedMode}&level=${levelOption}`)
                  }
                  aria-disabled={locked}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "relative min-h-28 rounded-2xl border bg-card p-4 transition duration-200",
                    active && "border-primary bg-secondary/70 ring-2 ring-primary/15",
                    locked
                      ? "pointer-events-none opacity-45"
                      : "hover:-translate-y-0.5 hover:shadow-lift"
                  )}
                >
                  <span className={cn("absolute right-4 top-4 h-2 w-2 rounded-full", levelDots[levelOption])} />
                  <span className="text-xl font-bold text-foreground">{levelOption}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("openLessons", {
                      open: levelSummary.unlockedLessons,
                      total: levelSummary.lessons,
                    })}
                  </span>
                  <span className="tabular mt-4 block text-xs font-semibold text-foreground/75">
                    {t("wordCount", { count: levelSummary.words })}
                  </span>
                </Link>
              );
            })}

            <Link
              href={withLocale(`/practice?mode=${selectedMode}&level=mix`)}
              aria-current={selectedLevel === "mix" ? "true" : undefined}
              className={cn(
                "relative min-h-28 rounded-2xl border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                selectedLevel === "mix" && "border-primary bg-secondary/70 ring-2 ring-primary/15"
              )}
            >
              <Shuffle className="absolute right-4 top-4 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-base font-bold text-foreground">{t("mixAll")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("allLevels")}</span>
              <span className="tabular mt-4 block text-xs font-semibold text-foreground/75">
                {t("wordCount", { count: getPracticeWordCount(selectedSummary, "mix") })}
              </span>
            </Link>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("step", { number: 3 })}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">{t("readyToStart")}</h2>
          </div>

          <div className="surface-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                  {t("yourSelection")}
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {t(selectedModeConfig.titleKey)}
                  <span className="mx-2 text-border">•</span>
                  {selectedLevel === "mix" ? t("allLevels") : selectedLevel}
                  <span className="mx-2 text-border">•</span>
                  <span className="tabular font-medium text-muted-foreground">
                    {t("wordCount", { count: selectedWordCount })}
                  </span>
                </p>
              </div>
            </div>

            {selectionAvailable ? (
              <Link
                href={withLocale(startHref)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                {t("startPractice")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground">
                {t("selectionUnavailable")}
              </span>
            )}
          </div>
        </section>

        <div className="mt-10 flex items-center gap-2 border-t pt-6 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("progressSaved")}
        </div>
      </div>
    </FeedWrapper>
  );
}
