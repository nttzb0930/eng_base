import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("TOEIC Reading localized routes stay thin and use route-specific skeletons", () => {
  const routes = [
    ["app/[locale]/(main)/learn/cert/toeic/page.tsx", "ToeicOverviewView"],
    [
      "app/[locale]/(main)/learn/cert/toeic/reading/page.tsx",
      "ToeicReadingListView",
    ],
    [
      "app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx",
      "ToeicReadingSessionView",
    ],
    [
      "app/[locale]/(session)/toeic/reading/results/[attemptId]/page.tsx",
      "ToeicReadingResultView",
    ],
  ] as const;
  for (const [path, view] of routes) {
    const source = read(path);
    assert.match(source, new RegExp(`import \\{ ${view} \\}`));
    assert.doesNotMatch(source, /use client/);
    assert.doesNotMatch(source, /fetch\(|webHttpClient|useQuery/);
  }

  const loadingRoutes = [
    [
      "app/[locale]/(main)/learn/cert/toeic/loading.tsx",
      "ToeicOverviewSkeleton",
    ],
    [
      "app/[locale]/(main)/learn/cert/toeic/reading/loading.tsx",
      "ToeicReadingListSkeleton",
    ],
    [
      "app/[locale]/(session)/toeic/reading/tests/[testId]/loading.tsx",
      "ToeicReadingSessionSkeleton",
    ],
    [
      "app/[locale]/(session)/toeic/reading/results/[attemptId]/loading.tsx",
      "ToeicReadingResultSkeleton",
    ],
  ] as const;
  for (const [path, skeleton] of loadingRoutes) {
    assert.match(read(path), new RegExp(skeleton));
  }
});

test("TOEIC certificate card enters the localized certificate overview", () => {
  const source = read("app/views/courses/CoursesView.tsx");
  assert.match(source, /course\.code === "toeic-600"/);
  assert.match(source, /href=\{withLocale\("\/learn\/cert\/toeic"\)\}/);
});

test("TOEIC Reading browser exposes Full Test and Parts 5-7 as selectable scopes", () => {
  const list = read("app/views/toeic-reading/ToeicReadingListView.tsx");
  const session = read("app/views/toeic-reading/ToeicReadingSessionView.tsx");
  const route = read(
    "app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx"
  );

  assert.match(list, /ToeicReadingScopeTabs/);
  assert.match(list, /scope=\$\{scope\}/);
  assert.match(session, /practicePart/);
  assert.match(route, /searchParams/);
  assert.match(route, /parseToeicReadingScope/);
});

test("TOEIC question cards align the prompt and review action in an internal header", () => {
  const source = read(
    "app/features/toeic-reading/components/ToeicQuestion.tsx"
  );

  assert.match(source, /<legend className="sr-only">/);
  assert.match(source, /flex items-start justify-between gap-4/);
  assert.doesNotMatch(source, /absolute right-/);
});

test("TOEIC question navigation shows explicit answered and review indicators", () => {
  const source = read(
    "app/features/toeic-reading/components/ToeicPartNavigation.tsx"
  );

  assert.match(source, /import \{ Bookmark, Check \} from "lucide-react"/);
  assert.match(source, /marked \?[\s\S]*<Bookmark/);
  assert.match(source, /answered \?[\s\S]*<Check/);
});

test("TOEIC question navigation selects one active question without fragment scrolling", () => {
  const source = read(
    "app/features/toeic-reading/components/ToeicPartNavigation.tsx"
  );

  assert.match(source, /activeQuestionId: number \| null/);
  assert.match(source, /onSelectQuestion: \(questionId: number\) => void/);
  assert.match(source, /<button/);
  assert.match(source, /onClick=\{\(\) => onSelectQuestion\(question\.id\)\}/);
  assert.match(
    source,
    /aria-current=\{\s*activeQuestionId === question\.id \? "step" : undefined\s*\}/
  );
  assert.doesNotMatch(source, /href=\{`#toeic-question-/);
});

test("TOEIC session renders one active question with Previous and Next controls", () => {
  const source = read("app/views/toeic-reading/ToeicReadingSessionView.tsx");

  assert.match(source, /const activeQuestion/);
  assert.match(source, /question=\{activeQuestion\.question\}/);
  assert.match(source, /t\("session\.previousQuestion"\)/);
  assert.match(source, /t\("session\.nextQuestion"\)/);
  assert.doesNotMatch(source, /testData\.parts\.map/);
});

test("TOEIC drafts use authenticated API autosave and server-projected card progress", () => {
  const session = read("app/views/toeic-reading/ToeicReadingSessionView.tsx");
  const list = read("app/views/toeic-reading/ToeicReadingListView.tsx");
  const resource = read(
    "app/features/toeic-reading/api/toeic-reading.api.ts"
  );

  assert.match(session, /useToeicReadingDraft/);
  assert.match(session, /createToeicReadingDraftQueue/);
  assert.match(session, /await draftQueue\.flush\(\)/);
  assert.doesNotMatch(session, /localStorage/);
  assert.match(list, /testItem\.draftProgress/);
  assert.match(list, /role="progressbar"/);
  assert.match(resource, /tests\/\$\{testId\}\/draft/);
});
