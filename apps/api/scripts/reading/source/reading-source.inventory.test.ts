import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildReadingSourceInventory,
  extractEmbeddedImageUrls,
} from "./reading-source.inventory.js";
import { parseReadingSourceRow } from "./reading-source.canonical.js";

function row(id: string, level: 1 | 2, html = `<p>${id}</p>`) {
  return parseReadingSourceRow({
    id,
    title: `Synthetic ${id}`,
    topic: "",
    level,
    order_index: Number(id.split("-").at(-1)),
    content_html: html,
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
}

test("builds a deterministic Reading inventory with excluded access counts", () => {
  const rows = [
    row(
      "reading-1",
      1,
      '<p>One</p><img src="https://media.example/shared.png">',
    ),
    row(
      "reading-2",
      2,
      '<img src="https://media.example/shared.png"><img src="https://media.example/unknown.jpg">',
    ),
  ];
  const accessSummaries = [
    {
      sourceId: "reading-1",
      sourceLevel: "1" as const,
      isFree: true,
      isHidden: false,
    },
    {
      sourceId: "reading-2",
      sourceLevel: "2" as const,
      isFree: true,
      isHidden: false,
    },
    {
      sourceId: "reading-3",
      sourceLevel: "1" as const,
      isFree: false,
      isHidden: false,
    },
    {
      sourceId: "reading-4",
      sourceLevel: "2" as const,
      isFree: true,
      isHidden: true,
    },
  ];
  const images = [
    {
      url: "https://media.example/shared.png",
      bytes: 1_024,
      mimeType: "image/png",
    },
    {
      url: "https://media.example/unknown.jpg",
      bytes: null,
      mimeType: "image/jpeg",
    },
  ];

  const inventory = buildReadingSourceInventory({
    accessSummaries,
    rows,
    images,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const laterInventory = buildReadingSourceInventory({
    accessSummaries: [...accessSummaries].reverse(),
    rows: [...rows].reverse(),
    images: [...images].reverse(),
    createdAt: "2026-08-01T00:00:00.000Z",
  });

  assert.deepEqual(
    {
      ...inventory,
      inventorySha256: undefined,
      createdAt: undefined,
    },
    {
      schemaVersion: 1,
      source: "dautoeic",
      visibleCount: 4,
      acceptedCount: 2,
      excludedNotFreeCount: 1,
      excludedHiddenCount: 1,
      sourceLevelCounts: { "1": 1, "2": 1 },
      questionCount: 2,
      embeddedImageCount: 2,
      knownImageBytes: 1_024,
      unknownImageSizeCount: 1,
      acceptedSourceIds: ["reading-1", "reading-2"],
      inventorySha256: undefined,
      createdAt: undefined,
    },
  );
  assert.equal(inventory.inventorySha256, laterInventory.inventorySha256);
  assert.match(inventory.inventorySha256, /^[a-f0-9]{64}$/u);
});

test("extracts unique HTTPS image URLs without treating HTML as executable", () => {
  const rows = [
    row(
      "reading-1",
      1,
      '<IMG alt="x" SRC="https://media.example/a.png"><img src="https://media.example/a.png"><img src="http://media.example/b.png"><script src="https://media.example/not-an-image.js"></script>',
    ),
  ];

  assert.deepEqual(extractEmbeddedImageUrls(rows), [
    "https://media.example/a.png",
  ]);
});

test("rejects duplicate source IDs and accepted-row scope mismatches", () => {
  const valid = row("reading-1", 1);
  const summary = {
    sourceId: "reading-1",
    sourceLevel: "1" as const,
    isFree: true,
    isHidden: false,
  };

  assert.throws(
    () =>
      buildReadingSourceInventory({
        accessSummaries: [summary, summary],
        rows: [valid],
        images: [],
        createdAt: "2026-07-31T00:00:00.000Z",
      }),
    /duplicate access-summary source ID/u,
  );
  assert.throws(
    () =>
      buildReadingSourceInventory({
        accessSummaries: [
          summary,
          {
            sourceId: "reading-2",
            sourceLevel: "2",
            isFree: true,
            isHidden: false,
          },
        ],
        rows: [valid],
        images: [],
        createdAt: "2026-07-31T00:00:00.000Z",
      }),
    /accepted source rows do not match access metadata/u,
  );
});

test("registers inventory as an explicit read-only operator command", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    packageJson.scripts?.["data:inventory-reading-source"],
    "tsx ./scripts/reading/source/inventory-reading-source.ts",
  );

  const source = readFileSync(
    resolve(
      process.cwd(),
      "scripts/reading/source/inventory-reading-source.ts",
    ),
    "utf8",
  );
  assert.match(source, /listAccessSummaries/u);
  assert.match(source, /listReadingRows/u);
  assert.match(source, /inspectEmbeddedImage/u);
  assert.match(source, /writeInventory/u);
  assert.doesNotMatch(source, /Prisma|migrate|downloadReadingSource/u);
});
