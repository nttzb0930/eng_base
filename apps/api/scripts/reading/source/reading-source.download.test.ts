import assert from "node:assert/strict";
import test from "node:test";

import { parseReadingSourceRow } from "./reading-source.canonical.js";
import { downloadReadingSource } from "./reading-source.download.js";
import { buildReadingSourceInventory } from "./reading-source.inventory.js";
import type {
  DautoeicReadingSource,
  ReadingSourceInventory,
  ReadingSourceStorage,
} from "./reading-source.types.js";

function row(
  id: string,
  options: { html?: string; correct?: string; order?: number } = {},
) {
  const parsed = parseReadingSourceRow({
    id,
    title: `Synthetic ${id}`,
    topic: "Office",
    level: "1",
    order_index: options.order ?? 1,
    content_html: options.html ?? `<p>Passage ${id}</p>`,
    questions_json: [
      {
        question: `Question ${id}?`,
        choices: [
          { label: "A", text: "First" },
          { label: "B", text: "Second" },
        ],
        correct: "A",
        explanation: "",
        translation: "",
      },
    ],
    vocabulary_json: [],
    is_free: true,
    is_hidden: false,
    updated_at: "2026-07-31T00:00:00.000Z",
  });
  if (options.correct) parsed.questions[0].correct = options.correct;
  return parsed;
}

function sourceFor(rows: ReturnType<typeof row>[]): DautoeicReadingSource {
  return {
    async listAccessSummaries() {
      return rows.map((item) => ({
        sourceId: item.sourceId,
        sourceLevel: item.sourceLevel,
        isFree: true,
        isHidden: false,
      }));
    },
    async listReadingRows() {
      return rows;
    },
    async inspectEmbeddedImage(url) {
      return { url, bytes: 3, mimeType: "image/png" };
    },
    async openEmbeddedImage() {
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          "content-length": "3",
          "content-type": "image/png",
        },
      });
    },
  };
}

class FakeStorage implements ReadingSourceStorage {
  writes: Array<{ sourceId: string; sourceVersion: string; name: string; value: unknown }> =
    [];
  rejected: Array<{ sourceId: string; sourceVersion: string; value: unknown }> = [];
  mediaWrites: string[] = [];
  completeIds = new Set<string>();
  packages = new Map<string, Record<string, unknown>>();

  async writeInventory() {
    return "inventory.json";
  }

  async readApprovedInventory(): Promise<ReadingSourceInventory> {
    throw new Error("not used");
  }

  async writePackageFile(
    sourceId: string,
    sourceVersion: string,
    name: "content.json" | "manifest.json" | "validation.json",
    value: unknown,
  ) {
    this.writes.push({ sourceId, sourceVersion, name, value });
    const key = `${sourceId}/${sourceVersion}`;
    const files = this.packages.get(key) ?? {};
    files[name] = value;
    this.packages.set(key, files);
  }

  async writeRejectedValidation(
    sourceId: string,
    sourceVersion: string,
    value: unknown,
  ) {
    this.rejected.push({ sourceId, sourceVersion, value });
  }

  async writeMedia(input: {
    sourceId: string;
    sourceVersion: string;
    mediaId: string;
    response: Response;
  }) {
    this.mediaWrites.push(input.mediaId);
    return {
      storageKey: `reading/${input.sourceId}/${input.sourceVersion}/media/${input.mediaId}`,
      bytes: 3,
      sha256: "a".repeat(64),
      mimeType: "image/png",
    };
  }

  async packageExists(sourceId: string) {
    return this.completeIds.has(sourceId);
  }

  async listCompletePackages() {
    return [...this.packages.keys()].map((key) => {
      const [sourceId, sourceVersion] = key.split("/");
      return { sourceId, sourceVersion };
    });
  }

  async readPackageFile(
    sourceId: string,
    sourceVersion: string,
    name: "content.json" | "manifest.json" | "validation.json",
  ) {
    return this.packages.get(`${sourceId}/${sourceVersion}`)?.[name];
  }
}

function inventoryFor(rows: ReturnType<typeof row>[]): ReadingSourceInventory {
  return buildReadingSourceInventory({
    accessSummaries: rows.map((item) => ({
      sourceId: item.sourceId,
      sourceLevel: item.sourceLevel,
      isFree: true,
      isHidden: false,
    })),
    rows,
    images: [],
    createdAt: "2026-07-31T00:00:00.000Z",
  });
}

const license = {
  name: "Authorized test license",
  reference: "LICENSE-READING-1",
  intendedUse: "English Base Reading review",
};

test("stops before content writes when live scope differs from approved inventory", async () => {
  const approvedRows = [row("reading-1")];
  const liveRows = [row("reading-1"), row("reading-2", { order: 2 })];
  const storage = new FakeStorage();

  await assert.rejects(
    downloadReadingSource({
      source: sourceFor(liveRows),
      storage,
      approvedInventory: inventoryFor(approvedRows),
      license,
      sourceWebUrl: "https://dautoeic.com/reading",
      concurrency: 2,
      now: () => new Date("2026-07-31T00:00:00.000Z"),
    }),
    /scope changed|checksum/u,
  );
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(storage.mediaWrites, []);
});

test("downloads valid packages and writes manifest last", async () => {
  const rows = [row("reading-1"), row("reading-2", { order: 2 })];
  const storage = new FakeStorage();

  const summary = await downloadReadingSource({
    source: sourceFor(rows),
    storage,
    approvedInventory: inventoryFor(rows),
    license,
    sourceWebUrl: "https://dautoeic.com/reading",
    concurrency: 2,
    now: () => new Date("2026-07-31T00:00:00.000Z"),
  });

  assert.deepEqual(summary.completed, ["reading-1", "reading-2"]);
  assert.deepEqual(summary.rejected, []);
  for (const sourceId of summary.completed) {
    assert.deepEqual(
      storage.writes
        .filter((write) => write.sourceId === sourceId)
        .map((write) => write.name),
      ["validation.json", "content.json", "manifest.json"],
    );
    const manifest = storage.writes.find(
      (write) => write.sourceId === sourceId && write.name === "manifest.json",
    )?.value as Record<string, unknown>;
    assert.equal(manifest["approvedInventorySha256"], inventoryFor(rows).inventorySha256);
    assert.equal(manifest["accessClassification"], "BASIC_FREE");
    assert.deepEqual(manifest["license"], license);
    assert.equal(JSON.stringify(manifest).includes("authorization"), false);
  }
});

test("resumes an already complete source version without rewriting it", async () => {
  const rows = [row("reading-1")];
  const storage = new FakeStorage();
  storage.completeIds.add("reading-1");

  const summary = await downloadReadingSource({
    source: sourceFor(rows),
    storage,
    approvedInventory: inventoryFor(rows),
    license,
    sourceWebUrl: "https://dautoeic.com/reading",
    concurrency: 1,
    now: () => new Date("2026-07-31T00:00:00.000Z"),
  });

  assert.deepEqual(summary.resumed, ["reading-1"]);
  assert.deepEqual(storage.writes, []);
});

test("downloads embedded images and records verified canonical media", async () => {
  const rows = [
    row("reading-1", {
      html: '<p>Passage</p><img src="https://media.example/image.png">',
    }),
  ];
  const storage = new FakeStorage();

  await downloadReadingSource({
    source: sourceFor(rows),
    storage,
    approvedInventory: buildReadingSourceInventory({
      accessSummaries: [
        {
          sourceId: "reading-1",
          sourceLevel: "1",
          isFree: true,
          isHidden: false,
        },
      ],
      rows,
      images: [
        {
          url: "https://media.example/image.png",
          bytes: 3,
          mimeType: "image/png",
        },
      ],
      createdAt: "2026-07-31T00:00:00.000Z",
    }),
    license,
    sourceWebUrl: "https://dautoeic.com/reading",
    concurrency: 1,
    now: () => new Date("2026-07-31T00:00:00.000Z"),
  });

  assert.equal(storage.mediaWrites.length, 1);
  const content = storage.writes.find(
    (write) => write.name === "content.json",
  )?.value as { embeddedMedia: unknown[] };
  assert.equal(content.embeddedMedia.length, 1);
});

test("rejects one invalid passage without discarding valid packages", async () => {
  const rows = [
    row("reading-1"),
    row("reading-2", { correct: "C", order: 2 }),
  ];
  const storage = new FakeStorage();

  const summary = await downloadReadingSource({
    source: sourceFor(rows),
    storage,
    approvedInventory: inventoryFor(rows),
    license,
    sourceWebUrl: "https://dautoeic.com/reading",
    concurrency: 2,
    now: () => new Date("2026-07-31T00:00:00.000Z"),
  });

  assert.deepEqual(summary.completed, ["reading-1"]);
  assert.equal(summary.rejected.length, 1);
  assert.equal(summary.rejected[0].sourceId, "reading-2");
  assert.match(summary.rejected[0].errors.join(" "), /correct label/u);
  assert.equal(storage.rejected.length, 1);
  assert.doesNotMatch(
    JSON.stringify(storage.rejected[0].value),
    /Question reading-2|First|Second/u,
  );
});
