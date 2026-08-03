"use client";

import type {
  ToeicWritingPart,
  ToeicWritingPartOneTaskSummary,
  ToeicWritingPartTwoTaskSummary,
} from "@repo/shared";
import { ArrowLeft, FilePenLine, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicBrowseContainer } from "@/app/features/toeic/components/ToeicBrowseContainer";
import { ToeicWritingCatalogSkeleton } from "@/app/features/toeic-writing/components/ToeicWritingCatalogSkeleton";
import { ToeicWritingPartOneCard } from "@/app/features/toeic-writing/components/ToeicWritingPartOneCard";
import { ToeicWritingPartTwoCard } from "@/app/features/toeic-writing/components/ToeicWritingPartTwoCard";
import { useToeicWritingTasks } from "@/app/features/toeic-writing/hooks/use-toeic-writing";
import {
  buildToeicWritingPatternFilters,
  filterToeicWritingPartOneTasks,
} from "@/app/features/toeic-writing/toeic-writing-catalog.utils";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { withLocale } from "@/app/i18n/paths";

const parts: ToeicWritingPart[] = [1, 2];

export function ToeicWritingCatalogView() {
  const t = useTranslations("toeicWriting");
  const currentLocale = useLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const part: ToeicWritingPart = searchParams.get("part") === "2" ? 2 : 1;
  const tasksQuery = useToeicWritingTasks(part);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const partOneTasks = useMemo(
    () =>
      (tasksQuery.data ?? []).filter(
        (task): task is ToeicWritingPartOneTaskSummary => task.part === 1
      ),
    [tasksQuery.data]
  );
  const partTwoTasks = useMemo(
    () =>
      (tasksQuery.data ?? []).filter(
        (task): task is ToeicWritingPartTwoTaskSummary => task.part === 2
      ),
    [tasksQuery.data]
  );
  const patternFilters = useMemo(
    () => buildToeicWritingPatternFilters(partOneTasks),
    [partOneTasks]
  );
  const activePattern = patternFilters.some(
    (filter) => filter.value === selectedPattern
  )
    ? selectedPattern
    : null;
  const visiblePartOneTasks = useMemo(
    () => filterToeicWritingPartOneTasks(partOneTasks, activePattern),
    [activePattern, partOneTasks]
  );

  if (tasksQuery.isLoading) return <ToeicWritingCatalogSkeleton />;

  if (tasksQuery.isError || !tasksQuery.data) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-md border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("catalog.errorTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("catalog.errorDescription")}
          </p>
          <Button
            type="button"
            onClick={() => void tasksQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("catalog.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  const visibleTasks = part === 1 ? visiblePartOneTasks : partTwoTasks;

  return (
    <FeedWrapper>
      <ToeicBrowseContainer>
        <Link
          href="/learn/cert/toeic"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-md text-sm font-semibold transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("catalog.back")}
        </Link>

        <header className="mt-7 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {t("catalog.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("catalog.title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-sm leading-6">
            {t("catalog.description")}
          </p>
        </header>

        <div
          className="bg-muted mt-7 inline-flex rounded-md border p-1"
          role="tablist"
          aria-label={t("catalog.partLabel")}
        >
          {parts.map((item) => {
            const active = item === part;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  const nextSearchParams = new URLSearchParams(
                    searchParams.toString()
                  );
                  nextSearchParams.set("part", String(item));
                  router.replace(
                    `${withLocale("/learn/cert/toeic/writing", locale)}?${nextSearchParams.toString()}`,
                    { scroll: false }
                  );
                }}
                className={`min-h-10 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {t(`catalog.part${item}`)}
              </button>
            );
          })}
        </div>

        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {t(`catalog.part${part}Description`)}
        </p>

        {part === 1 && partOneTasks.length > 0 ? (
          <div
            className="mt-6 flex flex-wrap gap-2"
            aria-label={t("catalog.patternFilterLabel")}
          >
            {patternFilters.map((filter) => {
              const active = filter.value === activePattern;
              return (
                <button
                  key={filter.value ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedPattern(filter.value)}
                  className={`min-h-9 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "bg-card hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                  }`}
                >
                  {filter.value
                    ? t("catalog.pattern", {
                        pattern: filter.value,
                        count: filter.count,
                      })
                    : t("catalog.allPatterns", { count: filter.count })}
                </button>
              );
            })}
          </div>
        ) : null}

        {visibleTasks.length === 0 ? (
          <section className="mt-8 rounded-md border border-dashed px-6 py-12 text-center">
            <FilePenLine className="text-muted-foreground mx-auto h-8 w-8" />
            <h2 className="mt-4 text-lg font-semibold">
              {t("catalog.emptyTitle")}
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {t("catalog.emptyDescription")}
            </p>
          </section>
        ) : (
          <section
            aria-label={t("catalog.available")}
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {part === 1
              ? visiblePartOneTasks.map((task) => (
                  <ToeicWritingPartOneCard key={task.id} task={task} />
                ))
              : partTwoTasks.map((task) => (
                  <ToeicWritingPartTwoCard key={task.id} task={task} />
                ))}
          </section>
        )}
      </ToeicBrowseContainer>
    </FeedWrapper>
  );
}
