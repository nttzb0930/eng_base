import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Learn views consume backend-owned CEFR and Dashboard progress", () => {
  const learnSource = read("app/views/learn/LearnView.tsx");
  const learnLevelSource = read("app/views/learn/LearnLevelView.tsx");

  assert.equal(learnSource.includes("useDashboard"), true);
  assert.equal(learnSource.includes("useCefrLevelProgress"), true);
  assert.equal(learnLevelSource.includes("useCefrLevelProgress"), true);

  for (const forbidden of [
    "C1",
    "C2",
    "2847",
    "867",
    "920",
    "1100",
    "1250",
    "completedCount * 15",
  ]) {
    assert.equal(learnLevelSource.includes(forbidden), false, forbidden);
  }

  for (const forbidden of [
    ">428<",
    ">7<",
    "87%",
    "count: 23",
    "count: 5",
    "count: 3",
    "428/1,247",
    "56/87",
  ]) {
    assert.equal(learnSource.includes(forbidden), false, forbidden);
  }
});

test("Learn Unit selection uses persisted CEFR and server-owned unlocks", () => {
  const source = read("app/features/courses/hooks/use-learn.ts");

  assert.equal(source.includes("unitItem.cefrLevel"), true);
  assert.equal(source.includes("unlockedLevels"), true);
  assert.equal(source.includes("getCefrLevel"), false);
  assert.equal(source.includes('title.split(" ")'), false);
});

test("Learn CEFR feedback is localized consistently in English and Vietnamese", () => {
  const en = JSON.parse(read("app/messages/en.json")) as Record<
    string,
    Record<string, unknown>
  >;
  const vi = JSON.parse(read("app/messages/vi.json")) as Record<
    string,
    Record<string, unknown>
  >;
  const keys = [
    "dataErrorTitle",
    "dataErrorDescription",
    "noCefrData",
    "totalVocabulary",
    "masteredProgress",
    "unlockRequirement",
    "unlockedLevels",
    "remainingLessons",
    "learnedWords",
    "dueWords",
    "lessonProgressSummary",
    "progressUnavailable",
  ];

  for (const key of keys) {
    assert.equal(typeof en.learn?.[key], "string", `en.learn.${key}`);
    assert.equal(typeof vi.learn?.[key], "string", `vi.learn.${key}`);
  }
  assert.equal(String(en.learn?.levelDescription).includes("C2"), false);
  assert.equal(String(vi.learn?.levelDescription).includes("C2"), false);
});

test("Learn Level reload skeleton mirrors the four supported CEFR cards", () => {
  const source = read("app/components/feedback/RouteSkeletons.tsx");
  const skeleton = source.slice(
    source.indexOf("export function LearnLevelPageSkeleton"),
    source.indexOf("export function CoursesPageSkeleton")
  );

  assert.equal(skeleton.includes("length: 4"), true);
  assert.equal(skeleton.includes("length: 6"), false);
});
