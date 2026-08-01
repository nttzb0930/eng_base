import type { ToeicReadingPart } from "@repo/shared";

export type ToeicReadingScope = "full" | ToeicReadingPart;

export const DEFAULT_TOEIC_READING_SCOPE: ToeicReadingScope = 5;

export function parseToeicReadingScope(
  value: string | null | undefined
): ToeicReadingScope {
  if (value === "full") return "full";
  if (value === "5" || value === "6" || value === "7") {
    return Number(value) as ToeicReadingPart;
  }
  return DEFAULT_TOEIC_READING_SCOPE;
}

export function scopeToPart(
  scope: ToeicReadingScope
): ToeicReadingPart | undefined {
  return scope === "full" ? undefined : scope;
}
