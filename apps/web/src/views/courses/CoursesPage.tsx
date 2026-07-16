import { getCourses, getUserProgress } from "@/src/modules/learning/queries";
import { CoursesView } from "@/src/views";

const CoursesPage = async () => {
  const coursesData = getCourses();
  const userProgressData = getUserProgress();

  const [courses, userProgress] = await Promise.all([
    coursesData,
    userProgressData,
  ]);

  return (
    <CoursesView
      courses={courses}
      activeCourseId={userProgress?.activeCourseId ?? undefined}
    />
  );
};

export default CoursesPage;
