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

test("TOEIC overview returns to the primary Learning path", () => {
  const overview = read("app/views/toeic-reading/ToeicOverviewView.tsx");

  assert.match(overview, /href="\/learn"/);
  assert.doesNotMatch(overview, /href="\/learn\/cert"/);
});

test("TOEIC navigation stays available for Reading routes while overview and Listening stay uncluttered", () => {
  const navigation = read("app/features/toeic/components/ToeicSectionNav.tsx");

  assert.match(navigation, /aria-current/);
  assert.match(navigation, /\/learn\/cert\/toeic\/listening/);
  assert.match(navigation, /\/learn\/cert\/toeic\/reading/);

  for (const [view, active] of [
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

  assert.doesNotMatch(
    read("app/views/toeic-reading/ToeicOverviewView.tsx"),
    /ToeicSectionNav/
  );
  assert.doesNotMatch(
    read("app/views/toeic-listening/ToeicListeningListView.tsx"),
    /ToeicSectionNav/
  );
  assert.doesNotMatch(
    read("app/views/toeic-listening/ToeicDictationListView.tsx"),
    /ToeicSectionNav/
  );
});

test("TOEIC browse views share one content container", () => {
  const container = read(
    "app/features/toeic/components/ToeicBrowseContainer.tsx"
  );
  assert.match(container, /w-full pb-12/);

  for (const view of [
    "app/views/toeic-reading/ToeicOverviewView.tsx",
    "app/views/toeic-listening/ToeicListeningListView.tsx",
    "app/views/toeic-listening/ToeicDictationListView.tsx",
    "app/views/toeic-reading/ToeicReadingListView.tsx",
    "app/views/toeic-grammar/ToeicGrammarCatalogView.tsx",
    "app/views/toeic-grammar/ToeicGrammarLessonView.tsx",
  ]) {
    assert.match(
      read(view),
      /ToeicBrowseContainer/,
      `${view} uses the shared container`
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

test("General English navigation localizes its accessible label", () => {
  const source = read(
    "app/features/general-english/components/GeneralEnglishSectionNav.tsx"
  );

  assert.match(source, /aria-label=\{t\("label"\)\}/);
  assert.doesNotMatch(source, /aria-label="Ch/);
});

test("General English discovery excludes the separate TOEIC learning path", () => {
  const discovery = read(
    "app/features/general-english/components/GeneralEnglishSectionNav.tsx"
  );
  const courses = read("app/views/courses/CoursesView.tsx");

  assert.match(discovery, /href:\s*"\/learn\/level"/);
  assert.match(discovery, /href:\s*"\/learn\/topic"/);
  assert.doesNotMatch(discovery, /href:\s*"\/learn\/cert"/);
  assert.doesNotMatch(discovery, /key:\s*"certs"/);
  assert.doesNotMatch(courses, /<DiscoveryTabs/);
});

test("General English browsing views compose one shared local navigation", () => {
  const navigation = read(
    "app/features/general-english/components/GeneralEnglishSectionNav.tsx"
  );

  for (const href of [
    "/learn/level",
    "/learn/topic",
    "/practice",
    "/reading",
  ]) {
    assert.match(navigation, new RegExp(`href: "${href}"`));
  }
  assert.match(navigation, /aria-current/);

  for (const [view, active] of [
    ["app/views/learn/LearnLevelView.tsx", "cefr"],
    ["app/views/topics/TopicsView.tsx", "topics"],
    ["app/views/practice/PracticeView.tsx", "practice"],
    ["app/views/reading/ReadingListView.tsx", "reading"],
  ] as const) {
    const source = read(view);
    assert.match(source, /GeneralEnglishSectionNav/, `${view} imports nav`);
    assert.match(
      source,
      new RegExp(`active="${active}"`),
      `${view} selects ${active}`
    );
  }
});

test("global navigation delegates Practice and Reading to General English", () => {
  const header = read("app/components/navigation/Header.tsx");
  const sidebar = read("app/components/navigation/Sidebar.tsx");
  const learn = read("app/views/learn/LearnView.tsx");

  assert.doesNotMatch(header, /label: t\("practice"\), href: "\/practice"/);
  assert.doesNotMatch(header, /label: t\("reading"\), href: "\/reading"/);
  assert.doesNotMatch(sidebar, /href=\{withLocale\("\/practice"\)\}/);
  assert.doesNotMatch(sidebar, /href=\{withLocale\("\/reading"\)\}/);
  assert.match(header, /activePrefixes/);
  assert.match(learn, /href=\{withLocale\("\/practice"\)\}/);
  assert.match(learn, /href=\{withLocale\("\/reading"\)\}/);
});

test("General English local navigation copy is synchronized", () => {
  for (const locale of ["en", "vi"] as const) {
    const catalog = messages(locale);
    const navigation = catalog.learn.generalNavigation as
      Record<string, unknown> | undefined;

    for (const key of ["label", "cefr", "topics", "practice", "reading"]) {
      assert.equal(
        typeof navigation?.[key],
        "string",
        `${locale}.learn.generalNavigation.${key}`
      );
    }
  }
});
