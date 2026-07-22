import {
  CEFR_LEVELS,
  type CefrLevel,
  type CefrLevelProgress,
} from "@repo/shared";

export function applyCefrUnlockPolicy(
  levels: Omit<CefrLevelProgress, "unlocked">[],
  confirmedLevel: CefrLevel | null
): CefrLevelProgress[] {
  const confirmedIndex = confirmedLevel
    ? CEFR_LEVELS.indexOf(confirmedLevel)
    : -1;

  return levels.map((level, index) => {
    const previous = levels[index - 1];
    const masteryUnlocked =
      index > 0 &&
      previous !== undefined &&
      previous.totalWords > 0 &&
      previous.masteredWords / previous.totalWords >= 0.8;

    return {
      ...level,
      unlocked: index === 0 || index <= confirmedIndex || masteryUnlocked,
    };
  });
}
