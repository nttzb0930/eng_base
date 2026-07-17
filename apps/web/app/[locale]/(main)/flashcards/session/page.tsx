import { FlashcardSessionView } from "@/app/views/flashcards/FlashcardSessionView";

type FlashcardSessionPageProps = {
  searchParams: Promise<{
    deck?: string;
  }>;
};

export default async function FlashcardSessionPage({
  searchParams,
}: FlashcardSessionPageProps) {
  const { deck } = await searchParams;

  return <FlashcardSessionView deck={deck} />;
}
