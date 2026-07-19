"use client";

import { useEffect } from "react";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Progress } from "@/app/components/ui/progress";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { useTopics } from "@/app/features/topics/hooks/use-topics";
import { groupVocabularyTopics } from "@/app/features/topics/utils/group-vocabulary-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
const getPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

export function TopicsView() {
  const t = useTranslations("topics");
  const nav = useTranslations("navigation");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const topicsQuery = useTopics(locale);

  const userProgress = userProgressQuery.data;
  const topics = topicsQuery.data ?? [];
  const isLoading = userProgressQuery.isLoading || topicsQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse) {
    return <ListPageSkeleton />;
  }

  const recommended = [...topics].sort((a, b) => {
    const aProgress = getPercent(a.learned, a.total);
    const bProgress = getPercent(b.learned, b.total);
    return bProgress - aProgress;
  })[0];
  const topicGroups = groupVocabularyTopics(topics);

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
          active="topics"
          learnLabel={nav("learn")}
          topicsLabel={nav("topics")}
          topicCount={topics.length}
        />

        {recommended && (
          <section className="relative overflow-hidden rounded-lg bg-[radial-gradient(120%_140%_at_0%_0%,#10b981_0%,#047857_55%,#064e3b_100%)] p-6 text-white shadow-brand sm:p-8">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("eyebrow")}
                </span>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{recommended.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                  {recommended.description}
                </p>
                <p className="tabular mt-4 text-xs font-semibold text-white/75">
                  {t("learned", { learned: recommended.learned, total: recommended.total })}
                </p>
              </div>
              <Link
                href={withLocale(`/topics/${recommended.slug}`)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-deep shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                {t("vocabulary")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("eyebrow")}
            </h2>
            <span className="tabular text-sm text-muted-foreground">{topics.length}</span>
          </div>

          {topics.length === 0 ? (
            <div className="surface-panel border-dashed p-8 text-center">
              <Sparkles className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <p className="mt-4 font-semibold text-foreground">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
            </div>
          ) : (
            <div className="space-y-10">
              {topicGroups.map((topicGroup) => (
                <section key={topicGroup.name}>
                  <div className="mb-4 flex items-center justify-between gap-4 border-b pb-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {topicGroup.name}
                    </h3>
                    <span className="tabular text-sm text-muted-foreground">
                      {topicGroup.topics.length}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {topicGroup.topics.map((topic) => {
                      const learnedPercent = getPercent(
                        topic.learned,
                        topic.total,
                      );
                      const masteredPercent = getPercent(
                        topic.mastered,
                        topic.total,
                      );

                      return (
                        <Link
                          key={topic.id}
                          href={withLocale(`/topics/${topic.slug}`)}
                          className="group flex min-h-64 flex-col rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                              <Layers
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="tabular rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                              {learnedPercent}%
                            </span>
                          </div>

                          <h4 className="mt-5 text-lg font-bold text-foreground">
                            {topic.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {topic.description}
                          </p>

                          <div className="mt-auto pt-5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="tabular text-foreground/75">
                                {t("learned", {
                                  learned: topic.learned,
                                  total: topic.total,
                                })}
                              </span>
                              <ArrowRight
                                className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                              />
                            </div>
                            <Progress
                              value={learnedPercent}
                              className="mt-2 h-1.5"
                            />
                            <div className="mt-1 h-0.5 rounded-full bg-primary/25">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${masteredPercent}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </FeedWrapper>
  );
}
