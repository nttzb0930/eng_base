import type { LessonWithCompletion, LessonWithUnit } from "@repo/shared";

import { LessonButton } from "./LessonButton";
import { UnitBanner } from "./UnitBanner";

type UnitProps = {
  id: number;
  order: number;
  title: string;
  description: string;
  lessons: LessonWithCompletion[];
  activeLesson: LessonWithUnit | undefined;
  activeLessonPercentage: number;
};

export const Unit = ({
  title,
  description,
  lessons,
  activeLesson,
  activeLessonPercentage,
}: UnitProps) => {
  return (
    <>
      <UnitBanner title={title} description={description} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lessons.map((lesson, index) => {
          const isCurrent = lesson.id === activeLesson?.id;
          const isLocked = !lesson.completed && !isCurrent;

          return (
            <LessonButton
              key={lesson.id}
              id={lesson.id}
              index={index}
              totalCount={lessons.length - 1}
              current={isCurrent}
              locked={isLocked}
              percentage={isCurrent ? activeLessonPercentage : lesson.completed ? 100 : 0}
            />
          );
        })}
      </div>
    </>
  );
};
