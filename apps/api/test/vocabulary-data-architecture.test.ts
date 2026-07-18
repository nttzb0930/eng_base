import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoot = join(import.meta.dirname, "..");
const repositoryRoot = join(apiRoot, "..", "..");
const vocabularyRoot = join(repositoryRoot, "data", "vocabulary");
const catalogPath = join(vocabularyRoot, "vocabulary-catalog.json");
const legacyCatalogPath = join(vocabularyRoot, "phase1-vocabulary.json");
const topicsPath = join(vocabularyRoot, "topics.json");

test("vocabulary data has one canonical catalog and taxonomy", () => {
  assert.equal(existsSync(catalogPath), true);
  assert.equal(existsSync(legacyCatalogPath), false);
  assert.equal(existsSync(topicsPath), true);

  const topics = JSON.parse(readFileSync(topicsPath, "utf8")) as Array<{
    slug: string;
  }>;
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Array<
    Record<string, unknown>
  >;

  assert.equal(topics.length, 103);
  assert.equal(new Set(topics.map((topic) => topic.slug)).size, 103);
  assert.equal(catalog.length, 3000);
  assert.equal(catalog.some((item) => "enriched" in item), false);
  assert.equal(
    catalog.filter((item) => item.dictionaryLookupCompleted === true).length,
    2693,
  );
});

test("generated vocabulary working data is ignored", () => {
  const gitignore = readFileSync(join(repositoryRoot, ".gitignore"), "utf8");

  assert.match(gitignore, /\/data\/vocabulary\/working\//u);
  assert.match(gitignore, /\/data\/vocabulary\/backups\//u);
});

test("vocabulary scripts use canonical catalog names and lookup metadata", () => {
  const scriptsRoot = join(apiRoot, "scripts");
  const scriptSource = readdirSync(scriptsRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readFileSync(join(scriptsRoot, name), "utf8"))
    .join("\n");

  assert.doesNotMatch(scriptSource, /phase1-vocabulary/u);
  assert.doesNotMatch(scriptSource, /item\.enriched|enriched\?:\s*boolean/u);
});
