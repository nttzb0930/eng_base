import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalReadingPackage,
  parseReadingSourceRow,
  sha256Text,
  sourceHtmlToPlainText,
  stableJson,
  validateCanonicalReadingPackage,
} from "./reading-source.canonical.js";

function validSourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "source-reading-1",
    title: "Synthetic Office Notice",
    topic: "Office",
    level: "1",
    order_index: 1,
    content_html:
      "<h1>Notice</h1><p>The office closes at five.</p><p>Please leave on time.</p>",
    questions_json: [
      {
        question: "When does the office close?",
        choices: [
          { label: "A", text: "At four" },
          { label: "B", text: "At five" },
        ],
        correct: "B",
        explanation: "The notice states the closing time.",
        translation: "Văn phòng đóng cửa lúc mấy giờ?",
      },
    ],
    vocabulary_json: [
      {
        word: "close",
        meaning: "đóng cửa",
      },
    ],
    is_free: true,
    is_hidden: false,
    updated_at: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

test("parses and normalizes a visible free Reading source row", () => {
  const row = parseReadingSourceRow(validSourceRow());

  assert.equal(row.sourceId, "source-reading-1");
  assert.equal(row.sourceLevel, "1");
  assert.equal(row.topic, "Office");
  assert.equal(row.access.classification, "BASIC_FREE");
  assert.deepEqual(row.questions[0].choices, [
    { label: "A", text: "At four" },
    { label: "B", text: "At five" },
  ]);
  assert.equal(row.questions[0].correct, "B");
});

test("accepts numeric source IDs and levels while preserving stable identity", () => {
  const row = parseReadingSourceRow(
    validSourceRow({ id: 17, level: 2, topic: "" }),
  );

  assert.equal(row.sourceId, "17");
  assert.equal(row.sourceLevel, "2");
  assert.equal(row.topic, null);
});

test("strictly rejects unknown Reading source fields", () => {
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ access_token: "secret" })),
    /access_token/u,
  );
});

test("rejects non-free and hidden Reading source rows", () => {
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ is_free: false })),
    /EXCLUDED_NOT_FREE/u,
  );
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ is_hidden: true })),
    /EXCLUDED_HIDDEN/u,
  );
});

test("rejects unsupported levels and incomplete Reading content", () => {
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ level: "3" })),
    /level/u,
  );
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ title: " " })),
    /title/u,
  );
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ content_html: " " })),
    /content_html/u,
  );
  assert.throws(
    () => parseReadingSourceRow(validSourceRow({ questions_json: [] })),
    /questions_json/u,
  );
});

test("rejects duplicate choices and answer keys outside the choices", () => {
  const duplicateChoices = [
    {
      question: "When does the office close?",
      choices: [
        { label: "A", text: "At four" },
        { label: " a ", text: "At five" },
      ],
      correct: "A",
      explanation: "",
      translation: "",
    },
  ];
  assert.throws(
    () =>
      parseReadingSourceRow(
        validSourceRow({ questions_json: duplicateChoices }),
      ),
    /duplicate choice label/u,
  );

  const missingCorrect = [
    {
      question: "When does the office close?",
      choices: [
        { label: "A", text: "At four" },
        { label: "B", text: "At five" },
      ],
      correct: "C",
      explanation: "",
      translation: "",
    },
  ];
  assert.throws(
    () =>
      parseReadingSourceRow(validSourceRow({ questions_json: missingCorrect })),
    /correct label "C" does not resolve/u,
  );
});

test("rejects duplicate normalized Reading questions", () => {
  const question = validSourceRow().questions_json[0];
  assert.throws(
    () =>
      parseReadingSourceRow(
        validSourceRow({
          questions_json: [
            question,
            { ...question, question: " WHEN DOES THE OFFICE CLOSE? " },
          ],
        }),
      ),
    /duplicate question/u,
  );
});

test("derives safe plain text without rendering source HTML", () => {
  assert.equal(
    sourceHtmlToPlainText(`
      <style>.secret { display:none }</style>
      <script>stealCredentials()</script>
      <h1 onclick="bad()">Notice &amp; Update</h1>
      <p>The office&nbsp;closes at five.<br>Leave on time.</p>
      <iframe src="https://unsafe.example">hidden frame</iframe>
    `),
    "Notice & Update\n\nThe office closes at five.\nLeave on time.",
  );
});

test("decodes safe named and numeric entities deterministically", () => {
  assert.equal(
    sourceHtmlToPlainText("<p>A &lt; B &amp;&amp; B &#62; 1 &#x1F44D;</p>"),
    "A < B && B > 1 👍",
  );
});

test("stable JSON and SHA-256 ignore object key insertion order", () => {
  const first = stableJson({ beta: 2, alpha: { delta: 4, gamma: 3 } });
  const second = stableJson({ alpha: { gamma: 3, delta: 4 }, beta: 2 });

  assert.equal(first, second);
  assert.equal(sha256Text(first), sha256Text(second));
  assert.match(sha256Text(first), /^[a-f0-9]{64}$/u);
});

test("builds and validates a canonical Reading package", () => {
  const row = parseReadingSourceRow(validSourceRow());
  const sourcePackage = buildCanonicalReadingPackage(row, [
    {
      id: "image-1",
      sourceUrl: "https://media.example/notice.png",
      storageKey:
        "reading/source-reading-1/version/media/aaaaaaaaaaaaaaaa.png",
      sha256: "a".repeat(64),
      bytes: 1024,
      mimeType: "image/png",
    },
  ]);

  assert.equal(sourcePackage.schemaVersion, 1);
  assert.equal(sourcePackage.source, "dautoeic");
  assert.match(sourcePackage.sourceVersion, /^[a-f0-9]{64}$/u);
  assert.equal(
    sourcePackage.plainTextDraft,
    "Notice\n\nThe office closes at five.\n\nPlease leave on time.",
  );
  assert.deepEqual(validateCanonicalReadingPackage(sourcePackage), sourcePackage);
});

test("rejects unsafe canonical media storage keys", () => {
  const row = parseReadingSourceRow(validSourceRow());
  const sourcePackage = buildCanonicalReadingPackage(row, [
    {
      id: "image-1",
      sourceUrl: "https://media.example/notice.png",
      storageKey: "../outside.png",
      sha256: "a".repeat(64),
      bytes: 1024,
      mimeType: "image/png",
    },
  ]);

  assert.throws(
    () => validateCanonicalReadingPackage(sourcePackage),
    /storageKey/u,
  );
});
