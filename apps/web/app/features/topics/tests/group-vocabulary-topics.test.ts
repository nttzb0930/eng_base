import assert from "node:assert/strict";
import test from "node:test";
import type { VocabularyTopic } from "@repo/shared";

type GroupModule = {
  groupVocabularyTopics?: (
    topics: readonly VocabularyTopic[],
  ) => Array<{ name: string; topics: VocabularyTopic[] }>;
};

const topic = (
  id: number,
  order: number,
  group: string,
): VocabularyTopic => ({
  id,
  slug: `topic-${id}`,
  title: `Topic ${id}`,
  description: `Description ${id}`,
  group,
  order,
  total: 0,
  learned: 0,
  mastered: 0,
});

async function loadGrouper() {
  return import("../utils/group-vocabulary-topics")
    .then((module) => module as GroupModule)
    .catch(() => ({} as GroupModule));
}

test("topic groups follow first topic order and cards remain ordered", async () => {
  const { groupVocabularyTopics } = await loadGrouper();
  assert.equal(typeof groupVocabularyTopics, "function");
  if (!groupVocabularyTopics) return;

  const groups = groupVocabularyTopics([
    topic(3, 30, "Travel"),
    topic(1, 10, "People"),
    topic(2, 20, "Travel"),
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      name: group.name,
      orders: group.topics.map((item) => item.order),
    })),
    [
      { name: "People", orders: [10] },
      { name: "Travel", orders: [20, 30] },
    ],
  );
});

test("topic grouping does not mutate its input", async () => {
  const { groupVocabularyTopics } = await loadGrouper();
  assert.equal(typeof groupVocabularyTopics, "function");
  if (!groupVocabularyTopics) return;

  const input = [topic(2, 20, "Travel"), topic(1, 10, "People")];
  const before = input.map((item) => item.id);

  groupVocabularyTopics(input);

  assert.deepEqual(input.map((item) => item.id), before);
});

test("blank topic groups share the stable Other bucket", async () => {
  const { groupVocabularyTopics } = await loadGrouper();
  assert.equal(typeof groupVocabularyTopics, "function");
  if (!groupVocabularyTopics) return;

  const groups = groupVocabularyTopics([
    topic(1, 1, ""),
    topic(2, 2, "   "),
  ]);

  assert.deepEqual(groups.map((group) => group.name), ["Other"]);
  assert.deepEqual(groups[0]?.topics.map((item) => item.id), [1, 2]);
});
