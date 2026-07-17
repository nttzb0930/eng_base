"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FlashcardSession } from "@/app/features/flashcards/components/FlashcardSession";
import { normalizeFlashcardDeck } from "@/app/features/flashcards/flashcard-deck";
import { useFlashcardSession } from "@/app/features/flashcards/hooks/use-flashcards";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
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

  const userProgress = userProgressQuery.data;
  const items = itemsQuery.data ?? [];
  const isLoading = userProgressQuery.isLoading || itemsQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress) {
      router.replace(withLocale("/learn", locale));
    }
  }, [isLoading, locale, router, userProgress]);

  if (isLoading || !userProgress) {
    return <SessionPageSkeleton embedded />;
  }

  const deckTitle =
    deckKey === "due"
      ? t("dueReview")
      : deckKey === "saved"
        ? t("savedWords")
        : deckKey === "weak"
          ? t("weakWords")
          : `${deckKey} ${t("title")}`;

  return <FlashcardSession initialItems={items} deckTitle={deckTitle} />;
}