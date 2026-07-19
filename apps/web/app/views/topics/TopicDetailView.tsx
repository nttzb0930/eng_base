"use client";

import { useEffect } from "react";
import { ArrowLeft, BookOpenText, Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CEFR_LEVELS } from "@repo/shared";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useTopic } from "@/app/features/topics/hooks/use-topics";
import { VocabularyCard } from "@/app/features/vocabulary/components/VocabularyCard";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type TopicDetailViewProps = {
  slug: string;
  level?: string;
};
const getPercent = (value: number, total: number) => {
  return total === 0 ? 0 : Math.round((value / total) * 100);
};

export function TopicDetailView({ slug, level }: TopicDetailViewProps) {
  const t = useTranslations("topics");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const topicQuery = useTopic(slug, locale, level);

  const userProgress = userProgressQuery.data;
  const topic = topicQuery.data;
  const isLoading = userProgressQuery.isLoading || topicQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse) {
    return <ListPageSkeleton />;
  }

  if (!topic) {
    return (
      <FeedWrapper>
        <div className="surface-panel border-dashed p-8 text-center">
          <p className="font-bold text-neutral-700">{t("emptyTitle")}</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href={withLocale("/topics")}>{t("back")}</Link>
          </Button>
        </div>
      </FeedWrapper>
    );
  }

  const learnedPercent = getPercent(topic.stats.learned, topic.stats.total);
  const masteredPercent = getPercent(topic.stats.mastered, topic.stats.total);

  return (
    <div className="flex justify-center px-6 w-full">
      <div className="w-full max-w-[672px]">
        <FeedWrapper>
          <div className="mx-auto flex w-full max-w-3xl flex-col pb-10">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mb-4 w-fit"
            >
              <Link href={withLocale("/topics")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back")}
              </Link>
            </Button>

            <div className="rounded-xl bg-green-500 p-6 text-white">
              <p className="text-sm font-black uppercase text-white/80">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-black">{topic.title}</h1>
              <p className="mt-3 text-lg leading-7 text-white/90">
                {topic.description}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white/15 p-3">
                  <p className="text-2xl font-black">{topic.stats.total}</p>
                  <p className="text-xs font-bold uppercase text-white/80">
                    {t("words")}
                  </p>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <p className="text-2xl font-black">{topic.stats.learned}</p>
                  <p className="text-xs font-bold uppercase text-white/80">
                    {t("learnedLabel")}
                  </p>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <p className="text-2xl font-black">{topic.stats.mastered}</p>
                  <p className="text-xs font-bold uppercase text-white/80">
                    {t("mastered")}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <Progress value={learnedPercent} className="h-3 bg-white/25" />
                <div
                  className="mt-1 h-1 rounded-full bg-white"
                  style={{ width: `${masteredPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Button
                asChild
                variant={!topic.selectedLevel ? "primary" : "secondary"}
                className="h-auto justify-start p-4"
              >
                <Link href={withLocale(`/topics/${topic.slug}`)}>
                  <span className="text-sm font-black uppercase">{t("all")}</span>
                </Link>
              </Button>
              {CEFR_LEVELS.map((cefrLevel) => {
                const active = topic.selectedLevel === cefrLevel;
                const count = topic.countsByLevel[cefrLevel];

                return (
                  <Button
                    key={cefrLevel}
                    asChild={count > 0}
                    disabled={count === 0}
                    variant={active ? "primary" : "secondary"}
                    className={cn("h-auto justify-start p-4", count === 0 && "opacity-60")}
                  >
                    {count > 0 ? (
                      <Link href={withLocale(`/topics/${topic.slug}?level=${cefrLevel}`)}>
                        <span className="flex flex-col items-start">
                          <span className="text-sm font-black uppercase">
                            {cefrLevel}
                          </span>
                          <span className="text-xs font-bold opacity-80">
                            {t("wordCount", { count })}
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <span className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase">
                          {cefrLevel}
                        </span>
                        <span className="text-xs font-bold opacity-80">
                          {t("wordCount", { count: 0 })}
                        </span>
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button asChild variant="primary" size="lg">
                <Link
                  href={
                    topic.selectedLevel
                      ? withLocale(`/flashcards/session?deck=${topic.selectedLevel}`)
                      : withLocale("/flashcards")
                  }
                >
                  <BookOpenText className="mr-2 h-5 w-5" />
                  {t("flashcards")}
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={withLocale("/practice")}>
                  <Brain className="mr-2 h-5 w-5" />
                  {t("practice")}
                </Link>
              </Button>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-neutral-800">
                  {t("vocabulary")}
                </h2>
                <p className="text-sm font-black uppercase text-muted-foreground">
                  {t("wordCount", { count: topic.filteredStats.total })}
                </p>
              </div>

              {topic.items.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed p-8 text-center">
                  <p className="font-bold text-neutral-700">
                    {t("noWordsInLevel")}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {topic.items.map((item) => (
                    <VocabularyCard key={item.id} item={item} showMeaning />
                  ))}
                </div>
              )}
            </div>
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
}
