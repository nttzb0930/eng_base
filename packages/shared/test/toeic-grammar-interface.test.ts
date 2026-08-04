import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sharedRoot = join(import.meta.dirname, "..");

test("Shared publishes the TOEIC Grammar learner interface from its root", () => {
  const grammarTypes = readFileSync(
    join(sharedRoot, "src/types/toeic-grammar.ts"),
    "utf8"
  );
  const typeIndex = readFileSync(
    join(sharedRoot, "src/types/index.ts"),
    "utf8"
  );

  assert.match(typeIndex, /export \* from "\.\/toeic-grammar\.js"/u);
  assert.match(grammarTypes, /export type ToeicGrammarPracticeMode =/u);
  assert.match(grammarTypes, /export type ToeicGrammarCatalog =/u);
  assert.match(grammarTypes, /export type ToeicGrammarPractice =/u);
  assert.match(grammarTypes, /export type ToeicGrammarAnswerPayload =/u);
  assert.match(grammarTypes, /export type ToeicGrammarAnswerResult =/u);
  assert.match(grammarTypes, /export type ToeicGrammarSubtopicDetail =/u);
  assert.match(grammarTypes, /export type ToeicGrammarLessonBlock =/u);
  assert.doesNotMatch(grammarTypes, /htmlContent/u);
  assert.doesNotMatch(grammarTypes, /@prisma|@nestjs|react/iu);
});

test("TOEIC Grammar exposes exactly four source practice modes", () => {
  const grammarTypes = readFileSync(
    join(sharedRoot, "src/types/toeic-grammar.ts"),
    "utf8"
  );

  const declaration = grammarTypes.match(
    /export type ToeicGrammarPracticeMode\s*=([^;]+);/u
  )?.[1];
  assert.ok(declaration);
  assert.deepEqual(
    [...declaration.matchAll(/"([^"]+)"/gu)].map((match) => match[1]),
    ["topic", "subtopic", "set", "level"]
  );
  assert.doesNotMatch(grammarTypes, /"cefr"/u);
});
