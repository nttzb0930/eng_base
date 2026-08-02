import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("Part scopes use guided practice while Full Test keeps the exam session", () => {
  const route = readSource(
    "app/[locale]/(session)/toeic/reading/tests/[testId]/page.tsx"
  );

  assert.match(route, /ToeicReadingPracticeView/);
  assert.match(route, /scope === "full"/);
  assert.match(route, /<ToeicReadingSessionView/);
  assert.match(route, /<ToeicReadingPracticeView/);
});

test("guided practice has responsive split layout and a sticky navigation footer", () => {
  const shell = readSource(
    "app/features/toeic-reading/components/ToeicReadingPracticeShell.tsx"
  );
  const workspace = readSource(
    "app/features/toeic-reading/components/ToeicReadingWorkspace.tsx"
  );

  assert.match(shell, /min-w-0/);
  assert.match(shell, /overflow-x-hidden/);
  assert.match(workspace, /lg:grid-cols-\[minmax\(0,38fr\)_minmax\(0,62fr\)\]/);
  assert.match(workspace, /lg:grid-cols-2/);
  assert.match(workspace, /lg:overflow-y-auto/);
  assert.match(workspace, /sticky bottom-0/);
  assert.doesNotMatch(workspace, /w-\[(?:3|4|5|6|7|8|9)\d\dpx\]/);
});

test("feedback is gated by a graded answer and navigation exposes its current value", () => {
  const feedback = readSource(
    "app/features/toeic-reading/components/ToeicReadingFeedback.tsx"
  );
  const drawer = readSource(
    "app/features/toeic-reading/components/ToeicReadingQuestionDrawer.tsx"
  );

  assert.match(feedback, /if \(!answer\) return null/);
  assert.match(drawer, /current[\s\S]*total/);
  assert.match(drawer, /progressValue/);
});
