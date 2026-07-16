export const CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export { MAX_HEARTS } from "./progress/index.js";

export * from "./contracts.js";
