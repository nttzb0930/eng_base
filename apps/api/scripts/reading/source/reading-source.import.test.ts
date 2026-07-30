import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalReadingPackage,
  sha256Text,
  stableJson,
} from "./reading-source.canonical.js";
import {
  importReadingSourceCandidates,
  type ReadingCandidateImportStore,
} from "./reading-source.import.js";
import type {
  ReadingSourceManifest,
  ReadingSourcePackageFile,
  ReadingSourceRow,
  ReadingSourceStorage,
} from "./reading-source.types.js";

function candidate(sourceId: string) {
  const row: ReadingSourceRow = {
    sourceId,
    title: `Title ${sourceId}`,
    topic: null,
    sourceLevel: "1",
    order: 1,
    contentHtml: "<p>A short passage.</p>",
    questions: [{
      question: "Question?",
      choices: [
        { label: "A", text: "Yes" },
        { label: "B", text: "No" },
      ],
      correct: "A",
      explanation: "",
      translation: "",
    }],
    vocabulary: [],
    access: {
      isFree: true,
      isHidden: false,
      classification: "BASIC_FREE",
    },
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
  const content = buildCanonicalReadingPackage(row, []);
  const validation = {
    schemaVersion: 1,
    sourceId,
    sourceVersion: content.sourceVersion,
    status: "VALID",
    errors: [],
    warnings: [],
  };
  const manifest: ReadingSourceManifest = {
    schemaVersion: 1,
    source: "dautoeic",
    sourceId,
    sourceVersion: content.sourceVersion,
    sourceWebUrl: "https://dautoeic.com/reading",
    accessClassification: "BASIC_FREE",
    approvedInventorySha256: "a".repeat(64),
    license: { name: "License", reference: "L1", intendedUse: "Review" },
    createdAt: "2026-07-31T00:00:00.000Z",
    files: {
      content: { sha256: sha256Text(stableJson(content)) },
      validation: { sha256: sha256Text(stableJson(validation)) },
    },
  };
  return { content, validation, manifest };
}

class PackageStorage implements ReadingSourceStorage {
  packages = new Map<string, ReturnType<typeof candidate>>();

  async writeInventory() { return ""; }
  async readApprovedInventory(): Promise<never> { throw new Error("unused"); }
  async writePackageFile(): Promise<void> {}
  async writeRejectedValidation(): Promise<void> {}
  async writeMedia(): Promise<never> { throw new Error("unused"); }
  async packageExists() { return false; }
  async listCompletePackages() {
    return [...this.packages].map(([sourceId, value]) => ({
      sourceId,
      sourceVersion: value.content.sourceVersion,
    }));
  }
  async readPackageFile(
    sourceId: string,
    _sourceVersion: string,
    name: ReadingSourcePackageFile,
  ) {
    const value = this.packages.get(sourceId);
    if (!value) throw new Error("missing");
    if (name === "content.json") return value.content;
    if (name === "validation.json") return value.validation;
    return value.manifest;
  }
}

test("imports candidates independently with deterministic result categories", async () => {
  const storage = new PackageStorage();
  for (const id of ["z-created", "a-unchanged", "m-immutable", "x-failed"]) {
    storage.packages.set(id, candidate(id));
  }
  const calls: string[] = [];
  const store: ReadingCandidateImportStore = {
    async importOne(content) {
      calls.push(content.sourceId);
      if (content.sourceId === "a-unchanged") return "UNCHANGED";
      if (content.sourceId === "m-immutable") return "IMMUTABLE_SKIPPED";
      if (content.sourceId === "x-failed") throw new Error("database unavailable");
      return "CREATED";
    },
  };

  const summary = await importReadingSourceCandidates({ storage, store });

  assert.deepEqual(summary.created, ["z-created"]);
  assert.deepEqual(summary.unchanged, ["a-unchanged"]);
  assert.deepEqual(summary.immutableSkipped, ["m-immutable"]);
  assert.deepEqual(summary.failed, [
    { sourceId: "x-failed", category: "VALIDATION" },
  ]);
  assert.equal(calls.length, 4);
});

test("never sends invalid or rejected private packages to the store", async () => {
  const storage = new PackageStorage();
  const rejected = candidate("rejected");
  rejected.validation.status = "REJECTED";
  storage.packages.set("rejected", rejected);
  const corrupt = candidate("corrupt");
  corrupt.manifest.files.content.sha256 = "b".repeat(64);
  storage.packages.set("corrupt", corrupt);
  let calls = 0;

  const summary = await importReadingSourceCandidates({
    storage,
    store: {
      async importOne() {
        calls += 1;
        return "CREATED";
      },
    },
  });

  assert.equal(calls, 0);
  assert.deepEqual(summary.rejected, ["rejected"]);
  assert.deepEqual(summary.failed, [
    { sourceId: "corrupt", category: "CHECKSUM" },
  ]);
});
