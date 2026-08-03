import { createHash } from "node:crypto";

import type { ToeicWritingCanonicalTask } from "./toeic-writing.types.js";

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON accepts only finite numbers");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)] as const);

    return Object.fromEntries(entries);
  }

  throw new TypeError(`Canonical JSON does not support ${typeof value}`);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function toeicWritingContentHashInput(
  task: ToeicWritingCanonicalTask,
): Omit<ToeicWritingCanonicalTask, "contentSha256" | "retrievedAt"> {
  return Object.fromEntries(
    Object.entries(task).filter(
      ([key]) => key !== "contentSha256" && key !== "retrievedAt",
    ),
  ) as Omit<ToeicWritingCanonicalTask, "contentSha256" | "retrievedAt">;
}

export function calculateToeicWritingContentSha256(
  task: ToeicWritingCanonicalTask,
): string {
  return sha256Canonical(toeicWritingContentHashInput(task));
}
