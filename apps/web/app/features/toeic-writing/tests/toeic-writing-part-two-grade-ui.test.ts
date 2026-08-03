import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  shouldApplyPartTwoGradeResult,
  validatePartTwoEditorResponse,
} from "../toeic-writing-coaching-state";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("Part 2 client validation blocks limits and obvious spam", () => {
  assert.equal(validatePartTwoEditorResponse("short").valid, false);
  assert.equal(
    validatePartTwoEditorResponse(
      Array.from({ length: 50 }, () => "hello").join(" ")
    ).issues.some(({ code }) => code === "OBVIOUS_SPAM"),
    true
  );
  assert.equal(
    validatePartTwoEditorResponse(
      Array.from({ length: 50 }, (_, index) => `word${index}`).join(" ")
    ).valid,
    true
  );
  assert.equal(
    validatePartTwoEditorResponse(
      "Dear support team, thank you for your message about the printer issue. I checked the paper tray and cleaned the rollers this morning. The printer still jams after every five pages, so could you arrange a repair under warranty? Please tell me when a technician can visit our office. Best regards, Alex."
    ).valid,
    true
  );
});

test("Part 2 result owns every official feedback section", () => {
  const files = [
    "ToeicWritingPartTwoResult.tsx",
    "ToeicWritingTaskCompletionPanel.tsx",
    "ToeicWritingSentenceVarietyPanel.tsx",
    "ToeicWritingGrammarPanel.tsx",
    "ToeicWritingImprovedEmail.tsx",
  ];
  for (const file of files) {
    assert.equal(
      existsSync(
        resolve(process.cwd(), "app/features/toeic-writing/components", file)
      ),
      true,
      file
    );
  }
  if (
    files.some(
      (file) =>
        !existsSync(
          resolve(process.cwd(), "app/features/toeic-writing/components", file)
        )
    )
  ) {
    return;
  }

  const result = read(
    "app/features/toeic-writing/components/ToeicWritingPartTwoResult.tsx"
  );
  assert.match(result, /taskCompletion/u);
  assert.match(result, /sentenceVariety/u);
  assert.match(result, /tone/u);
  assert.match(result, /grammar/u);
  assert.match(result, /paraphrase/u);
  assert.match(result, /improvedEmail/u);
  assert.match(result, /\/4/u);
  assert.match(result, /rounded-md/u);
});

test("Part 2 grading keeps rewrite and improved-email replacement separate", () => {
  const workspace = read(
    "app/features/toeic-writing/components/ToeicWritingPartTwoWorkspace.tsx"
  );
  assert.match(workspace, /onRewrite/u);
  assert.match(workspace, /pendingImprovedEmail/u);
  assert.match(workspace, /confirmImprovedEmail/u);
});

test("Part 2 editor stays writable while grading and ignores stale results", () => {
  assert.equal(shouldApplyPartTwoGradeResult("draft", "draft"), true);
  assert.equal(shouldApplyPartTwoGradeResult("draft", "edited"), false);

  const session = read("app/views/toeic-writing/ToeicWritingSessionView.tsx");
  const workspace = read(
    "app/features/toeic-writing/components/ToeicWritingPartTwoWorkspace.tsx"
  );
  const invocationStart = session.indexOf("<ToeicWritingPartTwoWorkspace");
  const invocation = session.slice(
    invocationStart,
    session.indexOf("/>", invocationStart)
  );
  assert.doesNotMatch(invocation, /disabled=/u);
  assert.match(workspace, /disabled=\{false\}/u);
  assert.doesNotMatch(session, /!state\.dirty \|\| gradingPending/u);
  assert.doesNotMatch(session, /navigatingRef\.current \|\| gradingPending/u);
});
