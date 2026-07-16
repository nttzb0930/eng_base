import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Course } from "@/src/modules/learning/queries";

type UserProgressProps = {
  activeCourse: Course;
  hearts: number;
  points: number;
};

export const UserProgress = ({
  activeCourse,
  hearts,
  points,
}: UserProgressProps) => {
  const t = useTranslations("common");

  return null;
};
