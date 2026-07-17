"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { SavedWordsReviewQuiz } from "@/app/features/review/components/SavedWordsReviewQuiz";
import type { SavedWordsReviewMode } from "@/app/features/review/api/review.api";
import { useSavedWordsReviewChallenges } from "@/app/features/review/hooks/use-review";
import { withLocale } from "@/app/i18n/paths";

type SavedWordsReviewViewProps = {
  mode?: string;
};

export function SavedWordsReviewView({ mode }: SavedWordsReviewViewProps) {
  const t = useTranslations("savedWords");
  const reviewMode: SavedWordsReviewMode = mode === "due" ? "due" : "all";
  const challengesQuery = useSavedWordsReviewChallenges(reviewMode);
  const challenges = challengesQuery.data ?? [];

  if (challengesQuery.isLoading) {
    return <SessionPageSkeleton embedded />;
  }
  if (challenges.length === 0) {
    return (
      <div className="px-6">
        <FeedWrapper>
          <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center text-center">
            <Image src="/heart.svg" alt={t("title")} height={90} width={90} />
            <h1 className="mt-6 text-2xl font-bold text-neutral-800">
              {t("emptyReviewTitle", {
                mode: reviewMode === "due" ? t("dueMode") : t("savedMode"),
              })}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {reviewMode === "due"
                ? t("emptyDueReviewDescription")
                : t("emptyAllReviewDescription")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {reviewMode === "due" && (
                <Button asChild variant="primary" size="lg">
                  <Link href={withLocale("/saved-words/review?mode=all")}>
                    {t("reviewAll")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="secondary" size="lg">
                <Link href={withLocale("/saved-words")}>
                  {t("backToSavedWords")}
                </Link>
              </Button>
            </div>
          </div>
        </FeedWrapper>
      </div>
    );
  }

  return (
    <SavedWordsReviewQuiz
      initialChallenges={challenges}
      reviewMode={reviewMode}
    />
  );
}
