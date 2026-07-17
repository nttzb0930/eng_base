"use client";

import { useTranslations } from "next-intl";
import type { CourseProgress, UnitWithLessons } from "@repo/shared/learning";

type UseLearnProps = {
  units: UnitWithLessons[];
  courseProgress: CourseProgress;
  unitParam?: string;
};

const CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

export const getCefrLevel = (title: string): CefrLevel | null => {
  const level = title.split(" ")[0];
  return CEFR_LEVELS.includes(level as CefrLevel) ? (level as CefrLevel) : null;
};

export function useLearn({ units, courseProgress, unitParam }: UseLearnProps) {
  const t = useTranslations("learn");

  const unlockedUnitIds = new Set<number>();
  let previousUnitsCompleted = true;

  for (const unitItem of units) {
    if (previousUnitsCompleted) {
      unlockedUnitIds.add(unitItem.id);
    }

    const unitCompleted =
      unitItem.lessons.length > 0 &&
      unitItem.lessons.every((lesson) => lesson.completed);

    previousUnitsCompleted = previousUnitsCompleted && unitCompleted;
  }

  const requestedUnitId = unitParam ? Number(unitParam) : undefined;
  const requestedUnitIsUnlocked =
    requestedUnitId !== undefined && unlockedUnitIds.has(requestedUnitId);
  const fallbackUnitId =
    courseProgress.activeLesson?.unitId && unlockedUnitIds.has(courseProgress.activeLesson.unitId)
      ? courseProgress.activeLesson.unitId
      : units.find((unitItem) => unlockedUnitIds.has(unitItem.id))?.id;
  const activeUnitId = requestedUnitIsUnlocked
    ? requestedUnitId
    : fallbackUnitId;
  const selectedUnit = units.find((unitItem) => unitItem.id === activeUnitId);

  return {
    t,
    unlockedUnitIds,
    activeUnitId,
    selectedUnit,
    getCefrLevel,
  };
}
