"use client";

import type { TopicPracticeMode } from "@repo/shared";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { useTopicPracticeChallenges } from "@/app/features/practice/hooks/use-practice";
import { WeakWordsPracticeQuiz } from "@/app/features/practice/weak-words/PracticeQuiz";
import { withLocale } from "@/app/i18n/paths";

type TopicPracticeViewProps = {
  slug: string;
  mode?: string;
};

function normalizeTopicPracticeMode(mode?: string): TopicPracticeMode {
  if (mode === "weak" || mode === "new") return mode;
  return "all";
}

export function TopicPracticeView({ slug, mode }: TopicPracticeViewProps) {
  const t = useTranslations("practice");
  const practiceMode = normalizeTopicPracticeMode(mode);
  const challengesQuery = useTopicPracticeChallenges(slug, practiceMode);
  const challenges = challengesQuery.data ?? [];

  if (challengesQuery.isLoading) {
    return <SessionPageSkeleton embedded />;
  }

  if (challengesQuery.isError) {
    return (
      <div
        className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center"
        role="alert"
      >
        <Image
          src="/mascot.svg"
          alt={t("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("topicLoadError")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("topicLoadErrorDescription")}
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() => void challengesQuery.refetch()}
        >
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center">
        <Image
          src="/mascot.svg"
          alt={t("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("topicPracticeEmpty")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("topicPracticeEmptyDescription")}
        </p>
        <Button asChild variant="primary" size="lg">
          <Link href={withLocale(`/topics/${slug}`)}>
            {t("backToTopic")}
          </Link>
        </Button>
      </div>
    );
  }

  return <WeakWordsPracticeQuiz initialChallenges={challenges} />;
}
