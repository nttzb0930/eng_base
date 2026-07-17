import { SavedWordsReviewView } from "@/app/views/review/SavedWordsReviewView";

type SavedWordsReviewPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function SavedWordsReviewPage({
  searchParams,
}: SavedWordsReviewPageProps) {
  const { mode } = await searchParams;

  return <SavedWordsReviewView mode={mode} />;
}
