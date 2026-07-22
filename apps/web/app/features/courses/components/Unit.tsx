"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

const DEFAULT_VISIBLE_LESSONS = 8;

export const Unit = ({
  title,
  description,
  lessons,
  activeLesson,
  activeLessonPercentage,
}: UnitProps) => {
  const [showAll, setShowAll] = useState(false);

  const visibleLessons = showAll ? lessons : lessons.slice(0, DEFAULT_VISIBLE_LESSONS);
  const remainingCount = lessons.length - DEFAULT_VISIBLE_LESSONS;

  return (
    <>
      <UnitBanner title={title} description={description} />
      
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">
          Danh sách bài học ({lessons.length} bài)
        </div>
        {remainingCount > 0 && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all"
          >
            {showAll ? (
              <>
                Thu gọn <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Xem tất cả {lessons.length} bài <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleLessons.map((lesson, index) => {
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

      {!showAll && remainingCount > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2 text-xs font-bold text-foreground shadow-xs transition hover:bg-muted hover:border-primary/30"
          >
            <span>+ Còn {remainingCount} bài học khác</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </>
  );
};
