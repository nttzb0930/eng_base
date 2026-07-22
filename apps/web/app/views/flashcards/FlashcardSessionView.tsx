"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { VocabularyItem } from "@repo/shared";
import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FlashcardSession } from "@/app/features/flashcards/components/FlashcardSession";
import { normalizeFlashcardDeck } from "@/app/features/flashcards/flashcard-deck";
import { useFlashcardSession } from "@/app/features/flashcards/hooks/use-flashcards";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useTopic } from "@/app/features/topics/hooks/use-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type FlashcardSessionViewProps = {
  deck?: string;
};

export function FlashcardSessionView({ deck }: FlashcardSessionViewProps) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const locale = useCurrentLocale();
  const deckKey = normalizeFlashcardDeck(deck);
  const userProgressQuery = useUserProgress();
  const itemsQuery = useFlashcardSession(deck);

  const topicQuery = useTopic(deck, locale);

  const userProgress = userProgressQuery.data;
  const rawItems = itemsQuery.data ?? [];
  const topicItems = topicQuery.data?.items ?? [];

  const isStandardDeck =
    deck === "due" ||
    deck === "saved" ||
    deck === "weak" ||
    ["A1", "A2", "B1", "B2", "C1", "C2"].includes(deck ?? "");

  const items: VocabularyItem[] =
    !isStandardDeck && topicItems.length > 0
      ? topicItems.map((item) => ({
          id: item.id,
          word: item.word,
          normalizedWord: item.word.toLowerCase(),
          pos: item.pos ?? "noun",
          posVi: null,
          cefrLevel: item.cefrLevel ?? "B1",
          phonetic: item.phonetic ?? null,
          phoneticSource: null,
          audioUrl: null,
          audioSource: null,
          exampleEn: item.exampleEn ?? null,
          exampleVi: item.exampleVi ?? null,
          exampleSource: null,
          meaningVi: item.meaningVi,
          primaryMeaningVi: item.meaningVi,
          source: "topic",
          createdAt: new Date(),
          updatedAt: new Date(),
          userSavedWords: [],
          userVocabularyProgress: [],
          vocabularyExamples: [],
        }))
      : rawItems;

  const isLoading =
    userProgressQuery.isLoading ||
    (!isStandardDeck ? topicQuery.isLoading : itemsQuery.isLoading);

  useEffect(() => {
    if (!isLoading && !userProgress) {
      router.replace(withLocale("/learn", locale));
    }
  }, [isLoading, locale, router, userProgress]);

  if (isLoading || !userProgress) {
    return <SessionPageSkeleton embedded />;
  }

  const deckTitle =
    topicQuery.data?.title
      ? topicQuery.data.title
      : deckKey === "due"
        ? t("dueReview")
        : deckKey === "saved"
          ? t("savedWords")
          : deckKey === "weak"
            ? t("weakWords")
            : `${deckKey} ${t("title")}`;

  return <FlashcardSession initialItems={items} deckTitle={deckTitle} />;
}