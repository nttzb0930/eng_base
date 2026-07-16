import { redirect } from "next/navigation";

import { getLocalizedPath } from "@/src/lib/i18n/server";
import { getUserProgress } from "@/src/modules/learning/queries";
import {
  getDictationPracticeChallenges,
  getDictationPracticeLevelSummary,
} from "@/src/modules/practice/dictation-session";
import {
  normalizePracticeCefrLevel,
  normalizePracticeLessonNumber,
} from "@/src/modules/practice/fill-blank-session";

import { DictationPracticeQuiz } from "@/src/views/practice/dictation/practice-quiz";

type DictationPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

const DictationPracticePage = async ({
  searchParams,
}: DictationPracticePageProps) => {
  const { level, lesson } = await searchParams;
  const practiceLevel = normalizePracticeCefrLevel(level);
  const lessonNumber = normalizePracticeLessonNumber(lesson);
  const [userProgress, summary, challenges] = await Promise.all([
    getUserProgress(),
    getDictationPracticeLevelSummary(),
    getDictationPracticeChallenges(practiceLevel, lesson),
  ]);

  if (!userProgress) redirect(await getLocalizedPath("/learn"));
  if (
    practiceLevel &&
    lessonNumber > summary[practiceLevel].unlockedLessons
  ) {
    redirect(await getLocalizedPath(`/practice?mode=dictation&level=${practiceLevel}`));
  }

  return (
    <DictationPracticeQuiz
      initialChallenges={challenges}
      practiceLevel={practiceLevel}
      lessonNumber={lessonNumber}
      totalLessons={practiceLevel ? summary[practiceLevel].lessons : undefined}
    />
  );
};

export default DictationPracticePage;
