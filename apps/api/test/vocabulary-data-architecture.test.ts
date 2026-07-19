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
    title: string;
    titleVi?: string;
    description: string;
    descriptionVi?: string;
    order: number;
    group: string;
    groupVi?: string;
  }>;
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Array<
    Record<string, unknown>
  >;

  assert.equal(topics.length, 103);
  assert.equal(new Set(topics.map((topic) => topic.slug)).size, 103);
  assert.equal(new Set(topics.map((topic) => topic.order)).size, 103);
  for (const topic of topics) {
    assert.notEqual(topic.title.trim(), "", `${topic.slug}.title`);
    assert.equal(typeof topic.titleVi, "string", `${topic.slug}.titleVi`);
    assert.notEqual(topic.titleVi?.trim(), "", `${topic.slug}.titleVi`);
    assert.notEqual(topic.description.trim(), "", `${topic.slug}.description`);
    assert.equal(
      typeof topic.descriptionVi,
      "string",
      `${topic.slug}.descriptionVi`,
    );
    assert.notEqual(
      topic.descriptionVi?.trim(),
      "",
      `${topic.slug}.descriptionVi`,
    );
    assert.notEqual(topic.group.trim(), "", `${topic.slug}.group`);
    assert.equal(typeof topic.groupVi, "string", `${topic.slug}.groupVi`);
    assert.notEqual(topic.groupVi?.trim(), "", `${topic.slug}.groupVi`);
  }

  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  for (const item of catalog) {
    const assignedTopics = item.topics ?? [];
    assert.equal(Array.isArray(assignedTopics), true);
    for (const slug of assignedTopics as unknown[]) {
      assert.equal(typeof slug, "string");
      assert.equal(topicSlugs.has(slug as string), true, String(slug));
    }
  }
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
  assert.deepEqual(
    readdirSync(vocabularyRoot)
      .filter((name) => /report|snapshot|normalization|correction/iu.test(name))
      .sort(),
    [],
  );
});

test("vocabulary scripts use canonical catalog names and lookup metadata", () => {
  const scriptsRoot = join(apiRoot, "scripts", "vocabulary");
  const scriptSource = readdirSync(scriptsRoot, { recursive: true })
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readFileSync(join(scriptsRoot, name), "utf8"))
    .join("\n");

  assert.doesNotMatch(scriptSource, /phase1-vocabulary/u);
  assert.doesNotMatch(scriptSource, /item\.enriched|enriched\?:\s*boolean/u);
});

test("vocabulary scripts are owned by explicit workflow folders", () => {
  const scriptsRoot = join(apiRoot, "scripts");
  const vocabularyScriptsRoot = join(scriptsRoot, "vocabulary");
  const expectedFlows = [
    "catalog",
    "database",
    "dictionary-enrichment",
    "normalization",
    "pos-correction",
    "topic-classification",
    "topic-expansion",
  ];

  for (const flow of expectedFlows) {
    assert.equal(existsSync(join(vocabularyScriptsRoot, flow)), true, flow);
  }

  const rootVocabularyScripts = readdirSync(scriptsRoot).filter((name) =>
    /vocab|topic/u.test(name),
  );
  assert.deepEqual(rootVocabularyScripts, ["vocabulary"]);
  assert.equal(existsSync(join(scriptsRoot, "lib")), false);
});

test("database seed adapters consume canonical sources without topic declarations", () => {
  const seedSource = [
    readFileSync(join(apiRoot, "scripts", "seed.ts"), "utf8"),
    readFileSync(
      join(
        apiRoot,
        "scripts",
        "vocabulary",
        "database",
        "seed-vocab-topics.ts",
      ),
      "utf8",
    ),
  ].join("\n");

  assert.match(seedSource, /loadVocabularySeedData/u);
  assert.doesNotMatch(seedSource, /topicDefinitions|topicsToSeed/u);
  assert.doesNotMatch(seedSource, /daily-life|food-drink/u);
});

test("AI prompts define stable runtime contracts without duplicated taxonomy", () => {
  const classificationPrompt = readFileSync(
    join(vocabularyRoot, "prompts", "topic-classification.md"),
    "utf8",
  );
  const expansionPrompt = readFileSync(
    join(vocabularyRoot, "prompts", "topic-expansion.md"),
    "utf8",
  );
  const prompts = `${classificationPrompt}\n${expansionPrompt}`;

  assert.doesNotMatch(prompts, /\{\{/u);
  assert.doesNotMatch(prompts, /Ã|Ä|â/u);
  assert.doesNotMatch(classificationPrompt, /- personal-information:/u);
  assert.match(classificationPrompt, /schemaVersion/u);
  assert.match(expansionPrompt, /exactly 10 bilingual example pairs/iu);
});
