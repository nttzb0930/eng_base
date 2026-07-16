import { redirect } from "next/navigation";

import type { Challenge } from "@/src/modules/learning/queries";
import { getLocalizedPath } from "@/src/lib/i18n/server";
import { getLesson, getUnits, getUserProgress } from "@/src/modules/learning/queries";
import { QuizView } from "@/src/views";

type LessonIdPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

const LessonIdPage = async ({ params }: LessonIdPageProps) => {
  const { lessonId } = await params;

  const lessonData = getLesson(Number(lessonId));
  const userProgressData = getUserProgress();
  const unitsData = getUnits();

  const [lesson, userProgress, units] = await Promise.all([
    lessonData,
    userProgressData,
    unitsData,
  ]);

  if (!lesson || !userProgress) {
    return redirect(await getLocalizedPath("/learn"));
  }

  const initialPercentage =
    (lesson.challenges.filter(
      (challenge: Challenge & { completed: boolean }) => challenge.completed
    ).length /
      lesson.challenges.length) *
    100;

  const orderedLessons = units.flatMap((unit) => unit.lessons);
  const lessonIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const nextLesson = lessonIndex >= 0 ? orderedLessons[lessonIndex + 1] : undefined;

  return (
    <QuizView
      initialLessonId={lesson.id}
      initialLessonTitle={lesson.title}
      initialLessonChallenges={lesson.challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={initialPercentage}
      nextLesson={nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null}
    />
  );
};

export default LessonIdPage;
