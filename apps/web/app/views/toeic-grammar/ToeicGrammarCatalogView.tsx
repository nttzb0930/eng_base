"use client";

import { ArrowLeft, BookOpenCheck, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicBrowseContainer } from "@/app/features/toeic/components/ToeicBrowseContainer";
import { ToeicSectionNav } from "@/app/features/toeic/components/ToeicSectionNav";
import { ToeicGrammarCatalogSkeleton } from "@/app/features/toeic-grammar/components/ToeicGrammarCatalogSkeleton";
import { ToeicGrammarCatalogTabs } from "@/app/features/toeic-grammar/components/ToeicGrammarCatalogTabs";
import { ToeicGrammarProgressCard } from "@/app/features/toeic-grammar/components/ToeicGrammarProgressCard";
import { useToeicGrammarCatalog } from "@/app/features/toeic-grammar/hooks/use-toeic-grammar";
import {
  firstToeicGrammarSubtopicTarget,
  type ToeicGrammarCatalogTab,
} from "@/app/features/toeic-grammar/toeic-grammar-route";
import { ToeicReadingModeTabs } from "@/app/features/toeic-reading/components/ToeicReadingModeTabs";

type ToeicGrammarCatalogViewProps = {
  tab: ToeicGrammarCatalogTab;
};

export function ToeicGrammarCatalogView({ tab }: ToeicGrammarCatalogViewProps) {
  const t = useTranslations("toeicGrammar");
  const locale = useLocale();
  const catalogQuery = useToeicGrammarCatalog();

  if (catalogQuery.isLoading) return <ToeicGrammarCatalogSkeleton />;
  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("error.description")}
          </p>
          <Button
            type="button"
            onClick={() => catalogQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  const catalog = catalogQuery.data;
  const empty =
    !catalog.available ||
    (tab === "topics" && catalog.topics.length === 0) ||
    (tab === "sets" && catalog.sets.length === 0) ||
    (tab === "levels" && catalog.levels.length === 0);

  return (
    <FeedWrapper>
      <ToeicBrowseContainer className="mx-auto max-w-[1100px]">
        <Link
          href="/learn/cert/toeic"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-lg text-sm font-semibold hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("catalog.back")}
        </Link>
        <ToeicSectionNav active="reading" />
        <header className="mt-7 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {t("catalog.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("catalog.title")}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {t("catalog.description")}
          </p>
        </header>

        <ToeicReadingModeTabs mode="grammar" />
        <ToeicGrammarCatalogTabs tab={tab} />

        {empty ? (
          <section className="mt-8 rounded-2xl border border-dashed px-6 py-12 text-center">
            <BookOpenCheck className="text-muted-foreground mx-auto h-8 w-8" />
            <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("empty.description")}
            </p>
          </section>
        ) : null}

        {!empty && tab === "topics" ? (
          <section
            aria-label={t("catalog.sections.topics")}
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {catalog.topics.map((topic) => {
              const firstSubtopic = firstToeicGrammarSubtopicTarget(topic);
              const title =
                locale === "vi"
                  ? topic.titleVi
                  : (topic.titleEn ?? topic.titleVi);
              return (
                <ToeicGrammarProgressCard
                  key={topic.target}
                  {...topic}
                  mode="topic"
                  title={title}
                  description={topic.descriptionVi}
                  detailHref={
                    firstSubtopic
                      ? `/learn/cert/toeic/reading/grammar/${encodeURIComponent(firstSubtopic)}`
                      : undefined
                  }
                />
              );
            })}
          </section>
        ) : null}

        {!empty && tab === "sets" ? (
          <section
            aria-label={t("catalog.sections.sets")}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            {catalog.sets.map((set) => (
              <ToeicGrammarProgressCard
                key={set.target}
                {...set}
                mode="set"
                title={set.titleVi}
                description={set.descriptionVi}
                eyebrow={
                  set.year
                    ? t("catalog.year", { year: set.year })
                    : t("catalog.mixed")
                }
              />
            ))}
          </section>
        ) : null}

        {!empty && tab === "levels" ? (
          <section
            aria-label={t("catalog.sections.levels")}
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {catalog.levels.map((level) => (
              <ToeicGrammarProgressCard
                key={level.target}
                {...level}
                mode="level"
                title={t("catalog.level.title", { level: level.level })}
                description={t(`catalog.level.description.${level.level}`)}
                eyebrow={t("catalog.level.eyebrow")}
              />
            ))}
          </section>
        ) : null}
      </ToeicBrowseContainer>
    </FeedWrapper>
  );
}
