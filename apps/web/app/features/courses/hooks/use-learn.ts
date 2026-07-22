"use client";

import { useTranslations } from "next-intl";
import type { CefrLevel, CourseProgress, UnitWithLessons } from "@repo/shared";

type UseLearnProps = {
  units: UnitWithLessons[];
  courseProgress: CourseProgress;
  unlockedLevels: ReadonlySet<CefrLevel>;
  unitParam?: string;
};

export function useLearn({
  units,
  courseProgress,
  unlockedLevels,
  unitParam,
}: UseLearnProps) {
  const t = useTranslations("learn");

  const unlockedUnitIds = new Set(
    units
      .filter(
        (unitItem) =>
          unitItem.cefrLevel !== null && unlockedLevels.has(unitItem.cefrLevel)
      )
      .map((unitItem) => unitItem.id)
  );

  const requestedUnitId = unitParam ? Number(unitParam) : undefined;
  const requestedUnitIsUnlocked =
    requestedUnitId !== undefined && unlockedUnitIds.has(requestedUnitId);
  const fallbackUnitId =
    courseProgress.activeLesson?.unitId &&
    unlockedUnitIds.has(courseProgress.activeLesson.unitId)
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
  };
}
