import type { PracticeCefrLevel } from "./practice.js";

export type FlashcardSummary = {
  due: number;
  saved: number;
  weak: number;
  levels: Record<PracticeCefrLevel, number>;
};
