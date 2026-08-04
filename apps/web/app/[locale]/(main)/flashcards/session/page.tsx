import { FlashcardSessionView } from "@/app/views/flashcards/FlashcardSessionView";

type FlashcardSessionPageProps = {
  searchParams: Promise<{
    deck?: string;
    source?: string;
    slug?: string;
  }>;
};

export default async function FlashcardSessionPage({
  searchParams,
}: FlashcardSessionPageProps) {
  const { deck, source, slug } = await searchParams;

  return <FlashcardSessionView deck={deck} source={source} slug={slug} />;
}
