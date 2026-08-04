import type { ToeicListeningPart } from "@repo/shared";

export type ToeicListeningScope = "full" | ToeicListeningPart;

export const DEFAULT_TOEIC_LISTENING_SCOPE: ToeicListeningScope = 1;

export function parseToeicListeningScope(
  value: string | null | undefined
): ToeicListeningScope {
  if (value === "full") return "full";
  if (value === "1" || value === "2" || value === "3" || value === "4") {
    return Number(value) as ToeicListeningPart;
  }
  return DEFAULT_TOEIC_LISTENING_SCOPE;
}

export function scopeToPart(
  scope: ToeicListeningScope
): ToeicListeningPart | undefined {
  return scope === "full" ? undefined : scope;
}
