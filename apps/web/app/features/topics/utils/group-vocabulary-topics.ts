import type { VocabularyTopic } from "@repo/shared";

export type VocabularyTopicGroup = {
  name: string;
  topics: VocabularyTopic[];
};

export function groupVocabularyTopics(
  topics: readonly VocabularyTopic[],
): VocabularyTopicGroup[] {
  const groups = new Map<string, VocabularyTopic[]>();

  for (const topic of [...topics].sort((left, right) => left.order - right.order)) {
    const groupName = topic.group.trim() || "Other";
    const groupTopics = groups.get(groupName) ?? [];
    groupTopics.push(topic);
    groups.set(groupName, groupTopics);
  }

  return [...groups].map(([name, groupedTopics]) => ({
    name,
    topics: groupedTopics,
  }));
}
