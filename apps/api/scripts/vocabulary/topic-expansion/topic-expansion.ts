import {
  validateVocabularySources,
  vocabularyIdentity,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

export type TopicDeficit = {
  slug: string;
  existingCount: number;
  requestedCount: number;
};

export type TopicExpansionArtifact = {
  schemaVersion: 1;
  status: "review" | "accepted" | "rejected";
  targetTopicSlug: string;
  requestedCount: number;
  examplesPerWord: number;
  generatedAt: string;
  words: VocabularyCatalogItem[];
};

export type ExpansionValidationResult = {
  errors: string[];
};

export function calculateTopicDeficits(
  topics: VocabularyTopicDefinition[],
  catalog: VocabularyCatalogItem[],
  minimumWords: number,
): TopicDeficit[] {
  if (!Number.isInteger(minimumWords) || minimumWords < 1) {
    throw new Error("Topic minimum word count must be a positive integer");
  }

  return [...topics]
    .sort((left, right) => left.order - right.order)
    .map((topic) => {
      const existingCount = catalog.filter((item) =>
        (item.topics ?? []).includes(topic.slug),
      ).length;
      return {
        slug: topic.slug,
        existingCount,
        requestedCount: Math.max(0, minimumWords - existingCount),
      };
    })
    .filter((deficit) => deficit.requestedCount > 0);
}

export function validateExpansionArtifact(
  catalog: VocabularyCatalogItem[],
  artifact: TopicExpansionArtifact,
  topics: VocabularyTopicDefinition[],
): ExpansionValidationResult {
  const errors: string[] = [];
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  if (!topicSlugs.has(artifact.targetTopicSlug)) {
    errors.push(`Unknown target topic "${artifact.targetTopicSlug}"`);
  }

  if (artifact.words.length !== artifact.requestedCount) {
    errors.push(
      `Expansion for "${artifact.targetTopicSlug}" requires exactly ${artifact.requestedCount} words`,
    );
  }

  const catalogIdentities = new Set(catalog.map(vocabularyIdentity));
  const artifactIdentities = new Set<string>();
  for (const word of artifact.words) {
    const identity = vocabularyIdentity(word);
    if (catalogIdentities.has(identity)) {
      errors.push(`Vocabulary "${identity}" already exists in catalog`);
    }
    if (artifactIdentities.has(identity)) {
      errors.push(`Duplicate expansion vocabulary identity "${identity}"`);
    }
    artifactIdentities.add(identity);

    if (
      word.topics?.length !== 1 ||
      word.topics[0] !== artifact.targetTopicSlug
    ) {
      errors.push(
        `Vocabulary "${identity}" must reference target topic "${artifact.targetTopicSlug}"`,
      );
    }
    if (word.source !== "ai-topic-expansion") {
      errors.push(`Vocabulary "${identity}" has invalid expansion source`);
    }
    if (word.exampleSource !== "ai-topic-expansion") {
      errors.push(`Vocabulary "${identity}" has invalid example source`);
    }
    if (word.dictionaryLookupCompleted !== false) {
      errors.push(`Vocabulary "${identity}" must await dictionary lookup`);
    }
    if (!word.exampleEn?.trim() || !word.exampleVi?.trim()) {
      errors.push(`Vocabulary "${identity}" requires bilingual example text`);
    }
    const examples = word.examples ?? [];
    const hasBilingualExamples = examples.every(
      (example) =>
        typeof example === "object" &&
        example !== null &&
        typeof example.exampleEn === "string" &&
        example.exampleEn.trim().length > 0 &&
        typeof example.exampleVi === "string" &&
        example.exampleVi.trim().length > 0,
    );
    if (
      examples.length !== artifact.examplesPerWord ||
      !hasBilingualExamples
    ) {
      errors.push(
        `Vocabulary "${identity}" requires exactly ${artifact.examplesPerWord} bilingual examples`,
      );
    }
    if (hasBilingualExamples) {
      const bilingualExamples = examples as Array<{
        exampleEn: string;
        exampleVi: string;
      }>;
      const firstExample = bilingualExamples[0];
      if (
        firstExample &&
        (word.exampleEn?.trim() !== firstExample.exampleEn.trim() ||
          word.exampleVi?.trim() !== firstExample.exampleVi.trim())
      ) {
        errors.push(
          `Vocabulary "${identity}" must use its first bilingual example as the primary example`,
        );
      }
      const distinctExamples = new Set(
        bilingualExamples.map(
          (example) =>
            `${example.exampleEn.trim().toLowerCase()}|${example.exampleVi.trim().toLowerCase()}`,
        ),
      );
      if (distinctExamples.size !== bilingualExamples.length) {
        errors.push(
          `Vocabulary "${identity}" requires distinct bilingual examples`,
        );
      }
    }
  }

  const sourceReport = validateVocabularySources(topics, artifact.words);
  errors.push(...sourceReport.errors);
  return { errors };
}

export function mergeAcceptedExpansion(
  catalog: VocabularyCatalogItem[],
  artifact: TopicExpansionArtifact,
  topics: VocabularyTopicDefinition[],
): VocabularyCatalogItem[] {
  if (artifact.status !== "accepted") {
    throw new Error("Topic expansion artifact must be accepted before merge");
  }
  const validation = validateExpansionArtifact(catalog, artifact, topics);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }
  return [
    ...catalog.map((item) => ({ ...item, topics: [...(item.topics ?? [])] })),
    ...artifact.words.map((item) => ({
      ...item,
      topics: [...(item.topics ?? [])],
    })),
  ];
}
