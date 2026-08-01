import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("TOEIC Grammar catalog route stays thin and owns a page skeleton", () => {
  const page = read(
    "app/[locale]/(main)/learn/cert/toeic/reading/grammar/page.tsx"
  );
  const loading = read(
    "app/[locale]/(main)/learn/cert/toeic/reading/grammar/loading.tsx"
  );

  assert.match(page, /ToeicGrammarCatalogView/);
  assert.match(page, /parseToeicGrammarCatalogTab/);
  assert.doesNotMatch(page, /use client|fetch\(|webHttpClient|useQuery/);
  assert.match(loading, /ToeicGrammarCatalogSkeleton/);
});

test("TOEIC Reading exposes test and Grammar practice as top-level modes", () => {
  const reading = read("app/views/toeic-reading/ToeicReadingListView.tsx");
  const tabs = read(
    "app/features/toeic-reading/components/ToeicReadingModeTabs.tsx"
  );

  assert.match(reading, /ToeicReadingModeTabs/);
  assert.match(tabs, /\/learn\/cert\/toeic\/reading\/grammar/);
  assert.match(tabs, /\/learn\/cert\/toeic\/reading\?scope=full/);
});

test("Grammar catalog renders URL-backed tabs and server progress", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarCatalogView.tsx");
  const card = read(
    "app/features/toeic-grammar/components/ToeicGrammarProgressCard.tsx"
  );

  assert.match(view, /ToeicGrammarCatalogTabs/);
  assert.match(view, /useToeicGrammarCatalog/);
  assert.match(card, /role="progressbar"/);
  assert.match(card, /correctCount/);
  assert.match(card, /incorrectCount/);
  assert.match(card, /unansweredCount/);
  assert.doesNotMatch(view, /localStorage/);
});
