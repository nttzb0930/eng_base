import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");
const read = (path: string) => {
  const absolutePath = join(webRoot, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
};

const messages = (locale: "en" | "vi") =>
  JSON.parse(read(`app/messages/${locale}.json`)) as {
    learn: Record<string, unknown>;
    topics: Record<string, unknown>;
    toeic: { navigation: Record<string, unknown> };
    toeicListening: { mode: Record<string, unknown> };
  };

test("Learning presents General English and TOEIC as primary paths", () => {
  const source = read("app/views/learn/LearnView.tsx");

  assert.match(source, /t\("generalEnglishTitle"\)/);
  assert.match(source, /t\("toeicPathTitle"\)/);
  assert.match(source, /href=\{withLocale\("\/learn\/cert\/toeic"\)\}/);
  assert.doesNotMatch(source, /t\("byCertDesc"\)/);
});

test("TOEIC browsing views compose a shared local navigation", () => {
  const navigation = read("app/features/toeic/components/ToeicSectionNav.tsx");

  assert.match(navigation, /aria-current/);
  assert.match(navigation, /\/learn\/cert\/toeic\/listening/);
  assert.match(navigation, /\/learn\/cert\/toeic\/reading/);

  for (const [view, active] of [
    ["app/views/toeic-reading/ToeicOverviewView.tsx", "overview"],
    ["app/views/toeic-listening/ToeicListeningListView.tsx", "listening"],
    ["app/views/toeic-listening/ToeicDictationListView.tsx", "listening"],
    ["app/views/toeic-reading/ToeicReadingListView.tsx", "reading"],
    ["app/views/toeic-grammar/ToeicGrammarCatalogView.tsx", "reading"],
  ] as const) {
    const source = read(view);
    assert.match(source, /ToeicSectionNav/, `${view} imports shared TOEIC nav`);
    assert.match(
      source,
      new RegExp(`active="${active}"`),
      `${view} selects ${active}`
    );
  }
});

test("English and Vietnamese expose truthful learning-path labels", () => {
  const en = messages("en");
  const vi = messages("vi");
  const learnKeys = [
    "learningPaths",
    "generalEnglishTitle",
    "generalEnglishDescription",
    "cefrPathTitle",
    "topicPathTitle",
    "toeicPathTitle",
    "toeicPathDescription",
    "openToeic",
  ];

  for (const key of learnKeys) {
    assert.equal(typeof en.learn[key], "string", `en.learn.${key}`);
    assert.equal(typeof vi.learn[key], "string", `vi.learn.${key}`);
  }

  for (const key of ["label", "overview", "listening", "reading"]) {
    assert.equal(
      typeof en.toeic?.navigation?.[key],
      "string",
      `en.toeic.navigation.${key}`
    );
    assert.equal(
      typeof vi.toeic?.navigation?.[key],
      "string",
      `vi.toeic.navigation.${key}`
    );
  }

  assert.equal(en.topics.byLevel, "CEFR");
  assert.equal(en.topics.byCert, "TOEIC");
  assert.equal(vi.topics.byLevel, "CEFR");
  assert.equal(vi.topics.byCert, "TOEIC");
  assert.equal(en.toeicListening.mode.level, "Listening tests");
  assert.equal(en.toeicListening.mode.dictation, "Intensive listening");
  assert.equal(vi.toeicListening.mode.level, "Luyện đề Listening");
  assert.equal(vi.toeicListening.mode.dictation, "Nghe chuyên sâu");

  for (const copy of [
    String(en.learn.byCertDesc),
    String(vi.learn.byCertDesc),
    String(en.topics.certDescription),
    String(vi.topics.certDescription),
  ]) {
    assert.doesNotMatch(copy, /IELTS|TOEFL|VSTEP/i);
  }
});

test("Discovery navigation localizes its accessible label", () => {
  const source = read("app/features/topics/components/DiscoveryTabs.tsx");

  assert.match(source, /aria-label=\{t\("modeLabel"\)\}/);
  assert.doesNotMatch(source, /aria-label="Ch/);
});

test("General English discovery excludes the separate TOEIC learning path", () => {
  const discovery = read("app/features/topics/components/DiscoveryTabs.tsx");
  const courses = read("app/views/courses/CoursesView.tsx");

  assert.match(discovery, /href:\s*"\/learn\/level"/);
  assert.match(discovery, /href:\s*"\/learn\/topic"/);
  assert.doesNotMatch(discovery, /href:\s*"\/learn\/cert"/);
  assert.doesNotMatch(discovery, /key:\s*"certs"/);
  assert.doesNotMatch(courses, /<DiscoveryTabs/);
});
