"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { DailyReviewQuiz } from "@/app/features/review/components/DailyReviewQuiz";
import { useDailyReviewChallenges } from "@/app/features/review/hooks/use-review";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

export function ReviewView() {
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const challengesQuery = useDailyReviewChallenges();

  const userProgress = userProgressQuery.data;
  const challenges = challengesQuery.data ?? [];
  const isLoading = userProgressQuery.isLoading || challengesQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress) {
      router.replace(withLocale("/learn", locale));
    }
  }, [isLoading, locale, router, userProgress]);

  if (isLoading || !userProgress) {
    return <SessionPageSkeleton embedded />;
  }

  return <DailyReviewQuiz initialChallenges={challenges} />;
}