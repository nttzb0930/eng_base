import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Topic Practice consumes server-owned challenges", () => {
  const source = readFileSync(
    join(
      import.meta.dirname,
      "../app/views/topics/TopicPracticeView.tsx",
    ),
    "utf8",
  );

  assert.match(source, /useTopicPracticeChallenges/);
  assert.doesNotMatch(
    source,
    /Math\.random|shuffledOthers|distractors|slice\(0/,
  );
  assert.doesNotMatch(source, /\buseTopic\(|useUserProgress|useMemo/);
});
