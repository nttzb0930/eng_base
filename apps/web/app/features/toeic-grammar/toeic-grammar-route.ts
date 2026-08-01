import type { ToeicGrammarPracticeMode } from "@repo/shared";

export type ToeicGrammarCatalogTab = "topics" | "sets" | "levels";

export function parseToeicGrammarCatalogTab(
  value: string | null | undefined
): ToeicGrammarCatalogTab {
  return value === "sets" || value === "levels" ? value : "topics";
}

export function parseToeicGrammarPracticeRoute(
  modeValue: string | null | undefined,
  targetValue: string | null | undefined
): { mode: ToeicGrammarPracticeMode; target: string } | null {
  if (
    modeValue !== "topic" &&
    modeValue !== "subtopic" &&
    modeValue !== "set" &&
    modeValue !== "level"
  ) {
    return null;
  }
  const target = targetValue?.trim() ?? "";
  if (!target) return null;
  if (modeValue === "level" && !["1", "2", "3", "4", "5"].includes(target)) {
    return null;
  }
  return { mode: modeValue, target };
}
