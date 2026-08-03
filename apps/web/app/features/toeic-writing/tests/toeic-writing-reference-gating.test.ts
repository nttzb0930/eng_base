import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("result renders learner response and labels reference as non-scored", () => {
  const source = read(
    "app/features/toeic-writing/components/ToeicWritingReferencePanel.tsx"
  );

  assert.match(source, /reference/iu);
  assert.match(source, /notScore|notScored/u);
  assert.doesNotMatch(source, /accuracy|AI score|band score/iu);
});

test("pre-submission task code cannot render reference fields", () => {
  const preSubmissionSources = [
    "app/views/toeic-writing/ToeicWritingCatalogView.tsx",
    "app/views/toeic-writing/ToeicWritingSessionView.tsx",
    "app/features/toeic-writing/components/ToeicWritingPartOneCard.tsx",
    "app/features/toeic-writing/components/ToeicWritingPartTwoCard.tsx",
    "app/features/toeic-writing/components/ToeicWritingPromptPane.tsx",
    "app/features/toeic-writing/components/ToeicWritingEditorPane.tsx",
    "app/features/toeic-writing/components/ToeicWritingSessionFooter.tsx",
  ].map(read);

  for (const source of preSubmissionSources) {
    assert.doesNotMatch(
      source,
      /samplesEn|samplesVi|structureSuggestions|\bideas\b|sampleEn|sampleVi|outlineLevel1|outlineLevel2|chunksLevel1|chunksLevel2/u
    );
  }
});
