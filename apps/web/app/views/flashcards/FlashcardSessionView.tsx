"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FlashcardSession } from "@/app/features/flashcards/components/FlashcardSession";
import type {
  FlashcardDeckKey,
  FlashcardSessionRequest,
} from "@/app/features/flashcards/flashcard-deck";
import { useFlashcardSession } from "@/app/features/flashcards/hooks/use-flashcards";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useTopics } from "@/app/features/topics/hooks/use-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type FlashcardSessionViewProps = {
  deck?: string;
  source?: string;
  slug?: string;
};

export function FlashcardSessionView({
  deck,
  source,
  slug,
}: FlashcardSessionViewProps) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const locale = useCurrentLocale();
  const isTopicSession = source === "topic";
  const request: FlashcardSessionRequest = isTopicSession
    ? { source: "topic", slug: slug ?? "" }
    : { deck: (deck ?? "due") as FlashcardDeckKey };
  const userProgressQuery = useUserProgress();
  const itemsQuery = useFlashcardSession(request);
  const topicsQuery = useTopics(locale);

  const userProgress = userProgressQuery.data;
  const items = itemsQuery.data ?? [];
  const isLoading =
    userProgressQuery.isLoading ||
    itemsQuery.isLoading ||
    (isTopicSession && topicsQuery.isLoading);

  useEffect(() => {
    if (!isLoading && !userProgress) {
      router.replace(withLocale("/learn", locale));
    }
  }, [isLoading, locale, router, userProgress]);

  if (isLoading || !userProgress) {
    return <SessionPageSkeleton embedded />;
  }

  const topic = isTopicSession
    ? topicsQuery.data?.find((item) => item.slug === slug)
    : undefined;
  const deckKey = "deck" in request ? request.deck : null;
  const deckTitle = topic?.title
    ? topic.title
    : deckKey === "due"
      ? t("dueReview")
      : deckKey === "saved"
        ? t("savedWords")
        : deckKey === "weak"
          ? t("weakWords")
          : deckKey
            ? `${deckKey} ${t("title")}`
            : t("topicSessionTitle");

  return <FlashcardSession initialItems={items} deckTitle={deckTitle} />;
}
