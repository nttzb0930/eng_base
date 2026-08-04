import { ENGLISH_VOCABULARY_COURSE_CODE } from "../course.constants";

type CourseIdLookup = {
  courses: {
    findUnique(args: {
      where: { code: string };
      select: { id: true };
    }): Promise<{ id: number } | null>;
  };
};

/**
 * CEFR lessons belong to the canonical English vocabulary course, not to a
 * currently selected certificate course such as TOEIC.
 */
export async function resolveLearningCourseId(
  prisma: CourseIdLookup,
  fallbackCourseId: number | null | undefined
) {
  const vocabularyCourse = await prisma.courses.findUnique({
    where: { code: ENGLISH_VOCABULARY_COURSE_CODE },
    select: { id: true },
  });

  return vocabularyCourse?.id ?? fallbackCourseId ?? null;
}
