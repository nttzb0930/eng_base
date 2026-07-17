"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Challenge } from "@repo/shared/learning";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { useUnits } from "@/app/features/courses/hooks/use-units";
import { LessonQuiz } from "@/app/features/lessons/components/LessonQuiz";
import { useLesson } from "@/app/features/lessons/hooks/use-lesson";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type LessonViewProps = {
  lessonId?: number;
};

export function LessonView({ lessonId }: LessonViewProps) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const lessonQuery = useLesson(lessonId);
  const unitsQuery = useUnits();
  const userProgressQuery = useUserProgress();

  const lesson = lessonQuery.data;
  const units = unitsQuery.data ?? [];
  const userProgress = userProgressQuery.data;
  const isLoading =
    lessonQuery.isLoading || unitsQuery.isLoading || userProgressQuery.isLoading;

  useEffect(() => {
    if (!isLoading && (!lesson || !userProgress)) {
      router.replace(withLocale("/learn", locale));
    }
  }, [isLoading, lesson, locale, router, userProgress]);

  if (isLoading || !lesson || !userProgress) {
    return <SessionPageSkeleton />;
  }

  const completedChallengeCount = lesson.challenges.filter(
    (challenge: Challenge & { completed: boolean }) => challenge.completed
  ).length;
  const initialPercentage = lesson.challenges.length
    ? (completedChallengeCount / lesson.challenges.length) * 100
    : 0;
  const orderedLessons = units.flatMap((unit) => unit.lessons);
  const lessonIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const nextLesson =
    lessonIndex >= 0 ? orderedLessons[lessonIndex + 1] : undefined;

  return (
    <LessonQuiz
      initialLessonId={lesson.id}
      initialLessonTitle={lesson.title}
      initialLessonChallenges={lesson.challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={initialPercentage}
      nextLesson={nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null}
    />
  );
}
