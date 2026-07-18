export type VocabularyTopicDefinition = {
  slug: string;
  title: string;
  description: string;
  order: number;
  group: string;
};

export type VocabularyCatalogItem = {
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic?: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  audioUrl?: string | null;
  audioSource?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  exampleSource?: string | null;
  examples?: Array<{ exampleEn: string; exampleVi: string }> | string[];
  dictionaryLookupCompleted?: boolean;
  topics?: string[];
};

export type VocabularyValidationReport = {
  topicCount: number;
  catalogItemCount: number;
  classifiedItems: number;
  unclassifiedItems: number;
  usedTopicSlugs: string[];
  unusedTopicSlugs: string[];
  duplicateVocabularyIdentities: number;
  errors: string[];
};

const validCefrLevels = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const vocabularyIdentity = (item: VocabularyCatalogItem) =>
  `${item.normalizedWord.trim().toLowerCase()}|${item.pos
    .trim()
    .toLowerCase()}|${item.cefrLevel.trim().toLowerCase()}`;

export function validateVocabularySources(
  topics: VocabularyTopicDefinition[],
  catalog: VocabularyCatalogItem[],
): VocabularyValidationReport {
  const errors: string[] = [];
  const topicSlugs = new Set<string>();

  for (const topic of topics) {
    const slug = topic.slug.trim();
    if (!slug) {
      errors.push("Topic slug must not be empty");
    } else if (topicSlugs.has(slug)) {
      errors.push(`Duplicate topic slug "${slug}"`);
    } else {
      topicSlugs.add(slug);
    }
  }

  const identities = new Set<string>();
  const duplicateIdentities = new Set<string>();
  const usedTopicSlugs = new Set<string>();
  let classifiedItems = 0;

  for (const item of catalog) {
    const identity = vocabularyIdentity(item);
    const requiredFields = [
      ["word", item.word],
      ["normalizedWord", item.normalizedWord],
      ["pos", item.pos],
      ["cefrLevel", item.cefrLevel],
      ["meaningVi", item.meaningVi],
      ["primaryMeaningVi", item.primaryMeaningVi],
    ] as const;

    for (const [field, value] of requiredFields) {
      if (!value.trim()) {
        errors.push(`Vocabulary "${identity}" has empty required field "${field}"`);
      }
    }

    if (!validCefrLevels.has(item.cefrLevel.toUpperCase())) {
      errors.push(
        `Vocabulary "${identity}" has invalid CEFR level "${item.cefrLevel}"`,
      );
    }

    if (identities.has(identity)) {
      duplicateIdentities.add(identity);
    } else {
      identities.add(identity);
    }

    const itemTopics = item.topics ?? [];
    if (itemTopics.length > 0) classifiedItems += 1;
    for (const slug of itemTopics) {
      if (!topicSlugs.has(slug)) {
        errors.push(`Vocabulary "${identity}" references unknown topic "${slug}"`);
      } else {
        usedTopicSlugs.add(slug);
      }
    }
  }

  for (const identity of duplicateIdentities) {
    errors.push(`Duplicate vocabulary identity "${identity}"`);
  }

  return {
    topicCount: topics.length,
    catalogItemCount: catalog.length,
    classifiedItems,
    unclassifiedItems: catalog.length - classifiedItems,
    usedTopicSlugs: [...usedTopicSlugs].sort(),
    unusedTopicSlugs: [...topicSlugs]
      .filter((slug) => !usedTopicSlugs.has(slug))
      .sort(),
    duplicateVocabularyIdentities: duplicateIdentities.size,
    errors,
  };
}

export function assertVocabularySourcesValid(
  topics: VocabularyTopicDefinition[],
  catalog: VocabularyCatalogItem[],
): VocabularyValidationReport {
  const report = validateVocabularySources(topics, catalog);
  if (report.errors.length > 0) {
    throw new Error(report.errors.join("\n"));
  }
  return report;
}
