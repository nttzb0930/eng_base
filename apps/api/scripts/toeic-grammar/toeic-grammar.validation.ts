import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";

type ValidationStorage = {
  listCompleteSnapshots(): Promise<string[]>;
  readSnapshotFile(snapshotVersion: string, name: string): Promise<unknown>;
  writeSnapshotFile(
    snapshotVersion: string,
    name: string,
    value: unknown
  ): Promise<void>;
};

export async function validateStoredToeicGrammar(input: {
  storage: ValidationStorage;
}) {
  const invalid: Array<{ snapshotVersion: string; errors: string[] }> = [];
  let validCount = 0;
  for (const snapshotVersion of await input.storage.listCompleteSnapshots()) {
    const errors: string[] = [];
    try {
      const content = normalizeGrammarSnapshot(
        await input.storage.readSnapshotFile(snapshotVersion, "content.json")
      );
      const manifest = (await input.storage.readSnapshotFile(
        snapshotVersion,
        "manifest.json"
      )) as Record<string, unknown>;
      if (
        manifest.source !== content.source ||
        manifest.snapshotVersion !== content.snapshotVersion ||
        manifest.inventorySha256 !== content.inventorySha256
      ) {
        errors.push("Manifest identity does not match content");
      }
      if (manifest.contentSha256 !== content.contentSha256) {
        errors.push("Manifest content checksum does not match content");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid snapshot");
    }
    await input.storage.writeSnapshotFile(
      snapshotVersion,
      "validation.json",
      {
        schemaVersion: 1,
        valid: errors.length === 0,
        errors,
        validatedAt: new Date().toISOString(),
      }
    );
    if (errors.length === 0) validCount += 1;
    else invalid.push({ snapshotVersion, errors });
  }
  return {
    snapshotCount: validCount + invalid.length,
    validCount,
    invalid,
  };
}
