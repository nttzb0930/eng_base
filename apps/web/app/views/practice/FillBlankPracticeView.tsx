"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FillBlankPracticeQuiz } from "@/app/features/practice/fill-blank/PracticeQuiz";
import {
  useFillBlankPracticeChallenges,
  useFillBlankPracticeSummary,
} from "@/app/features/practice/hooks/use-practice";
import {
  normalizePracticeCefrLevel,
  normalizePracticeLessonNumber,
} from "@/app/features/practice/practice-level";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type FillBlankPracticeViewProps = {
  level?: string;
  lesson?: string;
};

export function FillBlankPracticeView({ level, lesson }: FillBlankPracticeViewProps) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const practiceLevel = normalizePracticeCefrLevel(level);
  const lessonNumber = normalizePracticeLessonNumber(lesson);
  const challengeQuery = {
    level: practiceLevel,
    lesson: lesson ? lessonNumber : undefined,
  };
  const userProgressQuery = useUserProgress();
  const summaryQuery = useFillBlankPracticeSummary();
  const challengesQuery = useFillBlankPracticeChallenges(challengeQuery);

  const userProgress = userProgressQuery.data;
  const summary = summaryQuery.data;
  const challenges = challengesQuery.data ?? [];
  const isLoading = userProgressQuery.isLoading || summaryQuery.isLoading || challengesQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress) {
      router.replace(withLocale("/learn", locale));
      return;
    }

    if (!isLoading && summary && practiceLevel && lessonNumber > summary[practiceLevel].unlockedLessons) {
      router.replace(withLocale(`/practice?level=${practiceLevel}`, locale));
    }
  }, [isLoading, lessonNumber, locale, practiceLevel, router, summary, userProgress]);

  if (isLoading || !userProgress || !summary) {
    return <SessionPageSkeleton embedded />;
  }

  return (
    <FillBlankPracticeQuiz
      initialChallenges={challenges}
      practiceLevel={practiceLevel}
      lessonNumber={lessonNumber}
      totalLessons={practiceLevel ? summary[practiceLevel].lessons : undefined}
    />
  );
}