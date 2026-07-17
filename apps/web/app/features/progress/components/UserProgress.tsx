import type { Course } from "@repo/shared/learning";

type UserProgressProps = {
  activeCourse: Course;
  hearts: number;
  points: number;
};

export const UserProgress = (props: UserProgressProps) => {
  void props;

  return null;
};
