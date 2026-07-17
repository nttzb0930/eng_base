import type { PracticeLevelSummary } from "@repo/shared/practice";
import {
  normalizePracticeCefrLevel,
  PRACTICE_CEFR_LEVELS,
  type PracticeCefrLevel,
} from "@/app/features/practice/practice-level";

export const PRACTICE_MODES = ["fill-blank", "listening", "dictation"] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];
export type PracticeLevelSelection = PracticeCefrLevel | "mix";

export const normalizePracticeMode = (value?: string): PracticeMode =>
  value === "listening" || value === "dictation" ? value : "fill-blank";

export const normalizePracticeLevelSelection = (
  value?: string
): PracticeLevelSelection => {
  if (value === "mix") return "mix";
  return normalizePracticeCefrLevel(value) ?? "A1";
};

export const getPracticeWordCount = (
  summary: PracticeLevelSummary,
  level: PracticeLevelSelection
) =>
  level === "mix"
    ? PRACTICE_CEFR_LEVELS.reduce(
        (total, currentLevel) => total + summary[currentLevel].words,
        0
      )
    : summary[level].words;

export const getPracticeModeWordCount = (summary: PracticeLevelSummary) =>
  PRACTICE_CEFR_LEVELS.reduce(
    (total, level) => total + summary[level].words,
    0
  );

export const getPracticeStartHref = ({
  mode,
  level,
  summary,
}: {
  mode: PracticeMode;
  level: PracticeLevelSelection;
  summary: PracticeLevelSummary;
}) => {
  const query = new URLSearchParams();

  if (level === "mix") {
    query.set("lesson", "1");
  } else {
    query.set("level", level);
    query.set("lesson", String(Math.max(1, summary[level].unlockedLessons)));
  }

  return `/practice/${mode}?${query.toString()}`;
};

export const isPracticeSelectionAvailable = (
  summary: PracticeLevelSummary,
  level: PracticeLevelSelection
) => {
  if (level === "mix") return getPracticeWordCount(summary, level) > 0;
  return summary[level].unlockedLessons > 0 && summary[level].words > 0;
};
