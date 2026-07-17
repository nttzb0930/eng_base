import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { getTranslations } from "next-intl/server";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { Button } from "@/app/components/ui/button";
import { withLocale } from "@/app/i18n/paths";
import { getSavedWordReviewChallenges } from "@/src/modules/vocabulary/review-session";

import { SavedWordsReviewQuiz } from "@/src/views/saved-words/review/review-quiz";

type SavedWordsReviewPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

const SavedWordsReviewPage = async ({
  searchParams,
}: SavedWordsReviewPageProps) => {
  const t = await getTranslations("savedWords");
  const { mode } = await searchParams;
  const reviewMode = mode === "due" ? "due" : "all";
  const challenges = await getSavedWordReviewChallenges(reviewMode);

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
};

export default SavedWordsReviewPage;
