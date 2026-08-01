import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";
import type { ToeicGrammarSnapshot } from "./toeic-grammar.types.js";

export type ToeicGrammarImportStore = {
  replace(snapshot: ToeicGrammarSnapshot): Promise<"UPDATED" | "SKIPPED">;
};

type ImportStorage = {
  readSnapshotFile(snapshotVersion: string, name: string): Promise<unknown>;
};

export async function importToeicGrammar(input: {
  approvedSha256: string;
  storage: ImportStorage;
  store: ToeicGrammarImportStore;
}) {
  if (!/^[a-f0-9]{64}$/u.test(input.approvedSha256)) {
    throw new Error("approvedSha256 must be an exact SHA-256");
  }
  const [contentValue, manifestValue, validationValue] = await Promise.all([
    input.storage.readSnapshotFile(input.approvedSha256, "content.json"),
    input.storage.readSnapshotFile(input.approvedSha256, "manifest.json"),
    input.storage.readSnapshotFile(input.approvedSha256, "validation.json"),
  ]);
  const validation = validationValue as { valid?: unknown; errors?: unknown };
  if (validation.valid !== true) {
    throw new Error("Grammar snapshot validation is not valid");
  }
  const content = normalizeGrammarSnapshot(contentValue);
  const manifest = manifestValue as Record<string, unknown>;
  if (
    content.inventorySha256 !== input.approvedSha256 ||
    content.snapshotVersion !== input.approvedSha256 ||
    manifest.source !== content.source ||
    manifest.snapshotVersion !== content.snapshotVersion ||
    manifest.inventorySha256 !== content.inventorySha256 ||
    manifest.contentSha256 !== content.contentSha256
  ) {
    throw new Error(
      "Grammar snapshot manifest identity does not match content"
    );
  }
  return input.store.replace(content);
}
