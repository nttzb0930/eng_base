"use client";

import type { ToeicWritingPart } from "@repo/shared";
import { ArrowLeft, FilePenLine, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicBrowseContainer } from "@/app/features/toeic/components/ToeicBrowseContainer";
import { ToeicWritingCatalogSkeleton } from "@/app/features/toeic-writing/components/ToeicWritingCatalogSkeleton";
import { ToeicWritingTaskCard } from "@/app/features/toeic-writing/components/ToeicWritingTaskCard";
import {
  useToeicWritingOverview,
  useToeicWritingTasks,
} from "@/app/features/toeic-writing/hooks/use-toeic-writing";
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
  const overviewQuery = useToeicWritingOverview();
  const tasksQuery = useToeicWritingTasks(part);

  if (overviewQuery.isLoading || tasksQuery.isLoading) {
    return <ToeicWritingCatalogSkeleton />;
  }

  if (
    overviewQuery.isError ||
    !overviewQuery.data ||
    tasksQuery.isError ||
    !tasksQuery.data
  ) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("catalog.errorTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("catalog.errorDescription")}
          </p>
          <Button
            type="button"
            onClick={() => {
              void Promise.all([overviewQuery.refetch(), tasksQuery.refetch()]);
            }}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("catalog.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  const overview = overviewQuery.data;
  const selectedPart = overview.parts.find((item) => item.part === part);

  return (
    <FeedWrapper>
      <ToeicBrowseContainer>
        <Link
          href="/learn/cert/toeic"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
          className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2"
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
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "bg-card hover:border-emerald-500/60 hover:text-emerald-700 dark:hover:text-emerald-300"
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

        <dl className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="bg-card rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs">
              {t("catalog.published")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">
              {overview.publishedTaskCount}
            </dd>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs">
              {t("catalog.submitted")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">
              {overview.submittedTaskCount}
            </dd>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs">
              {t("catalog.available")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold">
              {selectedPart?.publishedTaskCount ?? tasksQuery.data.length}
            </dd>
          </div>
        </dl>

        {tasksQuery.data.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed px-6 py-12 text-center">
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
            className="mt-8 grid gap-5 md:grid-cols-2"
          >
            {tasksQuery.data.map((task) => (
              <ToeicWritingTaskCard key={task.id} task={task} />
            ))}
          </section>
        )}
      </ToeicBrowseContainer>
    </FeedWrapper>
  );
}
