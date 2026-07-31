import { createHash } from "node:crypto";

import type {
  ToeicGrammarInventory,
  ToeicGrammarSource,
} from "./toeic-grammar.types.js";

type InventoryStorage = {
  writeInventory(value: ToeicGrammarInventory): Promise<string>;
};

function ids(values: Array<{ sourceQuestionId: string }>) {
  return [...new Set(values.map((value) => value.sourceQuestionId))].sort();
}

export async function inventoryToeicGrammar(input: {
  source: ToeicGrammarSource;
  storage: InventoryStorage;
}) {
  const [catalog, sourceSets] = await Promise.all([
    input.source.readCatalog(),
    input.source.readSets(),
  ]);
  const topics = [...catalog.topics].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      a.sourceTopicId.localeCompare(b.sourceTopicId)
  );
  const subtopics = [...catalog.subtopics].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      a.sourceSubtopicId.localeCompare(b.sourceSubtopicId)
  );
  const topicRows = await Promise.all(
    topics.map(async (topic) => ({
      id: topic.sourceTopicId,
      questionIds: ids(
        await input.source.readTopicQuestions(topic.sourceTopicId)
      ),
    }))
  );
  const topicQuestionIds = Object.fromEntries(
    topicRows.map((row) => [row.id, row.questionIds])
  );
  const sets = (
    await Promise.all(
      sourceSets.map(async (set) => ({
        ...set,
        questionIds: ids(await input.source.readSetQuestions(set.sourceSetId)),
      }))
    )
  ).sort((a, b) => a.sourceSetId.localeCompare(b.sourceSetId));
  const difficultyLevels = await Promise.all(
    [1, 2, 3, 4, 5].map(async (level) => ({
      level,
      questionIds: ids(await input.source.readDifficultyQuestions(level)),
    }))
  );
  const content = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    topics,
    subtopics,
    topicQuestionIds,
    sets,
    difficultyLevels,
    counts: {
      topics: topics.length,
      subtopics: subtopics.length,
      sets: sets.length,
      topicQuestions: new Set(Object.values(topicQuestionIds).flat()).size,
      setQuestions: new Set(sets.flatMap((set) => set.questionIds)).size,
      difficultyQuestions: new Set(
        difficultyLevels.flatMap((level) => level.questionIds)
      ).size,
    },
  };
  const inventorySha256 = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  const inventory: ToeicGrammarInventory = { ...content, inventorySha256 };
  const storageKey = await input.storage.writeInventory(inventory);
  return { ...inventory, storageKey };
}
