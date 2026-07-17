import { redirect } from "next/navigation";

import { getUserProgress } from "@/src/modules/learning/queries";
import { getLocalizedPath } from "@/app/i18n/server";
import {
  getFillBlankPracticeChallenges,
  getFillBlankPracticeLevelSummary,
  normalizePracticeLessonNumber,
  normalizePracticeCefrLevel,
} from "@/src/modules/practice/fill-blank-session";

import { FillBlankPracticeQuiz } from "@/src/views/practice/fill-blank/practice-quiz";

type FillBlankPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

const FillBlankPracticePage = async ({
  searchParams,
}: FillBlankPracticePageProps) => {
  const { level, lesson } = await searchParams;
  const practiceLevel = normalizePracticeCefrLevel(level);
  const lessonNumber = normalizePracticeLessonNumber(lesson);
  const [userProgress, summary, challenges] = await Promise.all([
    getUserProgress(),
    getFillBlankPracticeLevelSummary(),
    getFillBlankPracticeChallenges(practiceLevel, lesson),
  ]);

  if (!userProgress) redirect(await getLocalizedPath("/learn"));
  if (
    practiceLevel &&
    lessonNumber > summary[practiceLevel].unlockedLessons
  ) {
    redirect(await getLocalizedPath(`/practice?level=${practiceLevel}`));
  }

  return (
    <FillBlankPracticeQuiz
      initialChallenges={challenges}
      practiceLevel={practiceLevel}
      lessonNumber={lessonNumber}
      totalLessons={practiceLevel ? summary[practiceLevel].lessons : undefined}
    />
  );
};

export default FillBlankPracticePage;
