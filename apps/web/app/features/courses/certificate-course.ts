import type { Course } from "@repo/shared";

const CERTIFICATE_COURSE_CODES = new Set([
  "ielts-academic",
  "toeic-600",
  "toefl-ibt",
  "vstep-b1",
]);

export const isCertificateCourse = (course: Course) =>
  CERTIFICATE_COURSE_CODES.has(course.code);
