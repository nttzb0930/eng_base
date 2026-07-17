import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { withLocale } from "@/app/i18n/paths";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { getUserProgress } from "@/src/modules/learning/queries";
import {
  getFlashcardSessionItems,
  normalizeFlashcardDeck,
} from "@/src/modules/flashcards/queries";

import { FlashcardSession } from "@/src/views/flashcards/flashcard-session";

type FlashcardSessionPageProps = {
  searchParams: Promise<{
    deck?: string;
  }>;
};

const FlashcardSessionPage = async ({
  searchParams,
}: FlashcardSessionPageProps) => {
  const t = await getTranslations("flashcards");
  const currentLocale = await getLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  const { deck } = await searchParams;
  const deckKey = normalizeFlashcardDeck(deck);
  const [userProgress, items] = await Promise.all([
    getUserProgress(),
    getFlashcardSessionItems(deck),
  ]);

  if (!userProgress) redirect(withLocale("/learn", locale));

  const deckTitle =
    deckKey === "due"
      ? t("dueReview")
      : deckKey === "saved"
        ? t("savedWords")
        : deckKey === "weak"
          ? t("weakWords")
          : `${deckKey} ${t("title")}`;

  return (
    <FlashcardSession
      initialItems={items}
      deckTitle={deckTitle}
    />
  );
};

export default FlashcardSessionPage;
