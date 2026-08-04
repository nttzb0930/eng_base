import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Reading routes stay thin and use the intended main and session shells", () => {
  const list = read("app/[locale]/(main)/reading/page.tsx");
  const session = read("app/[locale]/(session)/reading/[slug]/page.tsx");
  const result = read(
    "app/[locale]/(session)/reading/results/[attemptId]/page.tsx"
  );

  assert.match(list, /ReadingListView/);
  assert.match(session, /ReadingSessionView/);
  assert.match(result, /ReadingResultView/);
  for (const route of [list, session, result]) {
    assert.doesNotMatch(route, /use client/);
  }
});

test("Reading learner UI keeps questions and display controls accessible", () => {
  const question = read("app/features/reading/components/ReadingQuestion.tsx");
  const preferences = read(
    "app/features/reading/components/ReadingPreferences.tsx"
  );

  assert.match(question, /<fieldset/);
  assert.match(question, /<legend/);
  assert.match(question, /type="radio"/);
  assert.match(question, /name=\{`reading-question-/);
  assert.match(question, /focus-visible:/);
  assert.doesNotMatch(question, /correct:\s*boolean/);
  assert.match(preferences, /reading-display-preferences/);
  assert.match(preferences, /aria-pressed/);
  assert.match(preferences, /fontSize/);
  assert.match(preferences, /lineHeight/);
});

test("Reading is discoverable, localized, and has route-shaped loading states", () => {
  const header = read("app/components/navigation/Header.tsx");
  const sidebar = read("app/components/navigation/Sidebar.tsx");
  const generalEnglishNavigation = read(
    "app/features/general-english/components/GeneralEnglishSectionNav.tsx"
  );
  const learnOverview = read("app/views/learn/LearnView.tsx");
  const shell = read("app/components/layout/LearnerShell.tsx");
  const skeletons = read("app/components/feedback/RouteSkeletons.tsx");
  const listLoading = read("app/[locale]/(main)/reading/loading.tsx");
  const sessionLoading = read(
    "app/[locale]/(session)/reading/[slug]/loading.tsx"
  );
  const resultLoading = read(
    "app/[locale]/(session)/reading/results/[attemptId]/loading.tsx"
  );
  const english = JSON.parse(read("app/messages/en.json")) as Record<
    string,
    unknown
  >;
  const vietnamese = JSON.parse(read("app/messages/vi.json")) as Record<
    string,
    unknown
  >;

  assert.doesNotMatch(header, /href: "\/reading"/);
  assert.doesNotMatch(sidebar, /withLocale\("\/reading"\)/);
  assert.match(
    header,
    /activePrefixes: \["\/learn", "\/practice", "\/reading"\]/
  );
  assert.match(
    sidebar,
    /activeHrefs=\{\["\/learn", "\/practice", "\/reading"\]\}/
  );
  assert.match(generalEnglishNavigation, /href: "\/reading"/);
  assert.match(learnOverview, /withLocale\("\/reading"\)/);
  assert.match(shell, /ReadingListPageSkeleton/);
  assert.match(shell, /reading/);
  assert.match(skeletons, /ReadingListPageSkeleton/);
  assert.match(skeletons, /ReadingSessionPageSkeleton/);
  assert.match(skeletons, /ReadingResultPageSkeleton/);
  assert.match(listLoading, /ReadingListPageSkeleton/);
  assert.match(sessionLoading, /ReadingSessionPageSkeleton/);
  assert.match(resultLoading, /ReadingResultPageSkeleton/);
  assert.deepEqual(
    Object.keys(vietnamese.reading as object).sort(),
    Object.keys(english.reading as object).sort()
  );
});
