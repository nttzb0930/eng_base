"use client";

import type { Course } from "@/src/modules/learning/queries";
import { Card } from "./components/card";
import { useCourses } from "./hooks/useCourses";

type CoursesViewProps = {
  courses: Course[];
  activeCourseId?: number;
};

export default function CoursesView({ courses, activeCourseId }: CoursesViewProps) {
  const { t, onClick, pending } = useCourses({ activeCourseId });

  return (
    <div className="mx-auto h-full max-w-[912px] px-3">
      <h1 className="text-2xl font-bold text-neutral-700">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 pt-6 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
        {courses.map((course) => (
          <Card
            key={course.id}
            id={course.id}
            title={course.title}
            imageSrc={course.imageSrc}
            onClick={onClick}
            disabled={pending}
            isActive={course.id === activeCourseId}
          />
        ))}
      </div>
    </div>
  );
}
