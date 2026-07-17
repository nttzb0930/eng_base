"use client";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { CourseCard } from "@/app/features/courses/components/CourseCard";
import { useCourseSelection } from "@/app/features/courses/hooks/use-course-selection";
import { useCourses } from "@/app/features/courses/hooks/use-courses";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";

export function CoursesView() {
  const coursesQuery = useCourses();
  const progressQuery = useUserProgress();
  const activeCourseId = progressQuery.data?.activeCourseId ?? undefined;
  const { t, onClick, pending } = useCourseSelection({ activeCourseId });

  if (coursesQuery.isLoading || progressQuery.isLoading) {
    return <ListPageSkeleton />;
  }

  const courses = coursesQuery.data ?? [];

  return (
    <div className="mx-auto h-full max-w-[912px] px-3">
      <h1 className="text-2xl font-bold text-neutral-700">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 pt-6 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
        {courses.map((course) => (
          <CourseCard
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
