import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("Topic views render backend-owned learner progress", () => {
  const topicsView = read("app/views/topics/TopicsView.tsx");
  const topicDetailView = read("app/views/topics/TopicDetailView.tsx");

  assert.doesNotMatch(topicsView, /idx\s*%|index\s*===|CERT_APPEARS_PATTERN/);
  assert.doesNotMatch(
    topicDetailView,
    /globalIdx|Math\.min\(8|count:\s*95|score:\s*[235]/
  );
  assert.match(topicDetailView, /wordItem\.learnerState/);
  assert.match(
    topicDetailView,
    /topic\.filteredStats\.(weak|learning|unlearned)/
  );
  assert.match(topicsView, /topic\.weak/);
});
