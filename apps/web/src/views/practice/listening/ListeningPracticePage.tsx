import { redirect } from "next/navigation";

import { getUserProgress } from "@/src/modules/learning/queries";
import { getLocalizedPath } from "@/app/i18n/server";
import {
  getListeningPracticeChallenges,
  getListeningPracticeLevelSummary,
} from "@/src/modules/practice/listening-session";
import {
  normalizePracticeCefrLevel,
  normalizePracticeLessonNumber,
} from "@/src/modules/practice/fill-blank-session";

import { ListeningPracticeQuiz } from "@/src/views/practice/listening/practice-quiz";

type ListeningPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

const ListeningPracticePage = async ({
  searchParams,
}: ListeningPracticePageProps) => {
  const { level, lesson } = await searchParams;
  const practiceLevel = normalizePracticeCefrLevel(level);
  const lessonNumber = normalizePracticeLessonNumber(lesson);
  const [userProgress, summary, challenges] = await Promise.all([
    getUserProgress(),
    getListeningPracticeLevelSummary(),
    getListeningPracticeChallenges(practiceLevel, lesson),
  ]);

  if (!userProgress) redirect(await getLocalizedPath("/learn"));
  if (
    practiceLevel &&
    lessonNumber > summary[practiceLevel].unlockedLessons
  ) {
    redirect(
      await getLocalizedPath(
        `/practice?mode=listening&level=${practiceLevel}`
      )
    );
  }

  return (
    <ListeningPracticeQuiz
      initialChallenges={challenges}
      practiceLevel={practiceLevel}
      lessonNumber={lessonNumber}
      totalLessons={practiceLevel ? summary[practiceLevel].lessons : undefined}
    />
  );
};

export default ListeningPracticePage;
