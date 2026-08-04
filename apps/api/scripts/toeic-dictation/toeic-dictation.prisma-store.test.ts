import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import type { ToeicDictationImportSet } from "./toeic-dictation.import.js";
import { createPrismaToeicDictationImportStore } from "./toeic-dictation.prisma-store.js";

const sha = "a".repeat(64);
const input: ToeicDictationImportSet = {
  sourceVersion: sha,
  set: {
    sourceSetId: "set-1",
    name: "Test 1",
    folderPath: null,
    part: 1,
    accessLevel: "free",
    order: 1,
    collectionName: "2026",
    chapterName: null,
    subtitle: null,
    isHidden: false,
    items: [
      {
        sourceItemId: "item-1",
        sourceSetId: "set-1",
        order: 1,
        groupId: "lesson-1",
        groupOrder: 1,
        audioUrl: "https://example.com/1.mp3",
        transcript: "First sentence.",
        translationVi: "Câu thứ nhất.",
        durationSeconds: 1.25,
        isHidden: false,
        media: {
          url: "https://example.com/1.mp3",
          bytes: 100,
          contentType: "audio/mpeg",
        },
      },
      {
        sourceItemId: "item-2",
        sourceSetId: "set-1",
        order: 2,
        groupId: "lesson-1",
        groupOrder: 2,
        audioUrl: "https://example.com/2.mp3",
        transcript: "Second sentence.",
        translationVi: null,
        durationSeconds: null,
        isHidden: false,
        media: {
          url: "https://example.com/2.mp3",
          bytes: 200,
          contentType: "audio/mpeg",
        },
      },
    ],
  },
  mediaByUrl: {
    "https://example.com/1.mp3": {
      url: "https://example.com/1.mp3",
      storagePath: "dictation/1.mp3",
      sha256: "1".repeat(64),
      bytes: 100,
      contentType: "audio/mpeg",
    },
    "https://example.com/2.mp3": {
      url: "https://example.com/2.mp3",
      storagePath: "dictation/2.mp3",
      sha256: "2".repeat(64),
      bytes: 200,
      contentType: "audio/mpeg",
    },
  },
};

test("bulk upserts Dictation items while preserving item identities", async () => {
  const events: string[] = [];
  const statements: Array<{ strings: readonly string[]; values: unknown[] }> =
    [];
  let transactionOptions: unknown;
  const transaction = {
    toeic_dictation_sets: {
      create: async () => {
        events.push("set-draft");
        return { id: 7 };
      },
      update: async () => {
        events.push("set-published");
      },
    },
    toeic_dictation_items: {
      updateMany: async () => {
        events.push("items-deactivated");
      },
      upsert: async () => {
        throw new Error("per-item upsert must not be used");
      },
    },
    $executeRaw: async (statement: {
      strings: readonly string[];
      values: unknown[];
    }) => {
      events.push("items-bulk-upsert");
      statements.push(statement);
      return 2;
    },
  };
  const prisma = {
    toeic_dictation_sets: {
      findUnique: async () => null,
    },
    $transaction: async (
      run: (client: typeof transaction) => Promise<void>,
      options?: unknown
    ) => {
      transactionOptions = options;
      return run(transaction);
    },
  } as unknown as PrismaClient;

  const result = await createPrismaToeicDictationImportStore(
    prisma,
    () => new Date("2026-08-05T00:00:00.000Z")
  ).importSet(input);

  assert.equal(result, "UPDATED");
  assert.deepEqual(events, [
    "set-draft",
    "items-deactivated",
    "items-bulk-upsert",
    "set-published",
  ]);
  assert.equal(statements.length, 1);
  const sql = statements[0]!.strings.join("?");
  assert.match(sql, /INSERT INTO "toeic_dictation_items"/u);
  assert.match(
    sql,
    /ON CONFLICT \("set_id", "source_item_id"\) DO UPDATE SET/u
  );
  assert.match(sql, /"updated_at" = CURRENT_TIMESTAMP/u);
  assert.deepEqual(transactionOptions, {
    maxWait: 10_000,
    timeout: 120_000,
  });
});
