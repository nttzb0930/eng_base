import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  assertVocabularySourcesValid,
  vocabularyIdentity,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

export type VocabularyTopicRelationSeed = {
  vocabularyIdentity: string;
  topicSlug: string;
};

export type VocabularySeedData = {
  topics: VocabularyTopicDefinition[];
  catalog: VocabularyCatalogItem[];
  relations: VocabularyTopicRelationSeed[];
};

export const mapVocabularyTopicPersistenceData = (
  topic: VocabularyTopicDefinition,
) => ({
  title: topic.title,
  title_vi: topic.titleVi,
  description: topic.description,
  description_vi: topic.descriptionVi,
  group_name: topic.group,
  group_name_vi: topic.groupVi,
  order: topic.order,
});

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

export async function loadVocabularySeedData(
  dataDirectory: string,
): Promise<VocabularySeedData> {
  const [topics, catalog] = await Promise.all([
    readJson<VocabularyTopicDefinition[]>(path.join(dataDirectory, "topics.json")),
    readJson<VocabularyCatalogItem[]>(
      path.join(dataDirectory, "vocabulary-catalog.json"),
    ),
  ]);

  assertVocabularySourcesValid(topics, catalog);

  return {
    topics,
    catalog,
    relations: catalog.flatMap((item) =>
      (item.topics ?? []).map((topicSlug) => ({
        vocabularyIdentity: vocabularyIdentity(item),
        topicSlug,
      })),
    ),
  };
}
