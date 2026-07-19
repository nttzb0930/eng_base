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

export type TopicCandidate = {
  word: string;
  pos: string;
  cefrLevel: string;
  tier?: "core" | "supporting";
};

export type RejectedTopicCandidate = TopicCandidate & {
  reason: TopicCandidateRejectionReason;
};

export type TopicCandidateRejectionReason =
  | "catalog-duplicate"
  | "artifact-duplicate"
  | "invalid-word"
  | "invalid-pos"
  | "invalid-cefr-level"
  | `supporting:${string}`
  | `review:${string}`;

export type TopicCandidateReviewDecision = TopicCandidate & {
  decision: "core" | "supporting" | "reject";
  reason: string;
};

export type TopicCandidateArtifact = {
  schemaVersion: 1;
  status: "review" | "accepted" | "rejected";
  targetTopicSlug: string;
  requestedCount: number;
  generatedAt: string;
  candidates: TopicCandidate[];
  rejected: RejectedTopicCandidate[];
};

export type ExpansionValidationResult = {
  errors: string[];
};

const requiredVocabularyStringFields = [
  "word",
  "normalizedWord",
  "pos",
  "cefrLevel",
  "meaningVi",
  "primaryMeaningVi",
] as const satisfies ReadonlyArray<keyof VocabularyCatalogItem>;

const identityVocabularyFields = [
  "normalizedWord",
  "pos",
  "cefrLevel",
] as const satisfies ReadonlyArray<keyof VocabularyCatalogItem>;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const allowedCefrLevels = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

const vocabularyLabel = (
  word: Partial<VocabularyCatalogItem>,
  index: number
) => (isNonEmptyString(word.word) ? word.word.trim() : `<word ${index + 1}>`);

const hasIdentityFields = (
  word: Partial<VocabularyCatalogItem>
): word is VocabularyCatalogItem =>
  identityVocabularyFields.every((field) => isNonEmptyString(word[field]));

const hasCatalogRequiredFields = (
  word: Partial<VocabularyCatalogItem>
): word is VocabularyCatalogItem =>
  requiredVocabularyStringFields.every((field) =>
    isNonEmptyString(word[field])
  );

export function calculateTopicDeficits(
  topics: VocabularyTopicDefinition[],
  catalog: VocabularyCatalogItem[],
  minimumWords: number
): TopicDeficit[] {
  if (!Number.isInteger(minimumWords) || minimumWords < 1) {
    throw new Error("Topic minimum word count must be a positive integer");
  }

  return [...topics]
    .sort((left, right) => left.order - right.order)
    .map((topic) => {
      const existingCount = catalog.filter((item) =>
        (item.topics ?? []).includes(topic.slug)
      ).length;
      return {
        slug: topic.slug,
        existingCount,
        requestedCount: Math.max(0, minimumWords - existingCount),
      };
    })
    .filter((deficit) => deficit.requestedCount > 0);
}

const candidateIdentity = (candidate: TopicCandidate) =>
  `${candidate.word.trim().toLowerCase()}|${candidate.pos
    .trim()
    .toLowerCase()}|${candidate.cefrLevel.trim().toLowerCase()}`;

const hasCandidateIdentityFields = (
  candidate: Partial<TopicCandidate>
): candidate is TopicCandidate =>
  isNonEmptyString(candidate.word) &&
  isNonEmptyString(candidate.pos) &&
  isNonEmptyString(candidate.cefrLevel);

const rejectCandidate = (
  candidate: TopicCandidate,
  reason: RejectedTopicCandidate["reason"]
): RejectedTopicCandidate => ({ ...candidate, reason });

export function dedupeTopicCandidates(
  catalog: VocabularyCatalogItem[],
  pendingArtifacts: TopicCandidateArtifact[],
  artifact: TopicCandidateArtifact
): TopicCandidateArtifact {
  const knownIdentities = new Set(catalog.map(vocabularyIdentity));
  for (const pendingArtifact of pendingArtifacts) {
    if (pendingArtifact.targetTopicSlug !== artifact.targetTopicSlug) continue;
    for (const candidate of pendingArtifact.candidates) {
      knownIdentities.add(candidateIdentity(candidate));
    }
  }

  const acceptedCandidates: TopicCandidate[] = [];
  const rejectedCandidates: RejectedTopicCandidate[] = [...artifact.rejected];

  for (const candidate of artifact.candidates) {
    if (!isNonEmptyString(candidate.word)) {
      rejectedCandidates.push(rejectCandidate(candidate, "invalid-word"));
      continue;
    }
    if (!isNonEmptyString(candidate.pos)) {
      rejectedCandidates.push(rejectCandidate(candidate, "invalid-pos"));
      continue;
    }
    if (!allowedCefrLevels.has(candidate.cefrLevel)) {
      rejectedCandidates.push(rejectCandidate(candidate, "invalid-cefr-level"));
      continue;
    }

    const identity = candidateIdentity(candidate);
    if (catalog.some((item) => vocabularyIdentity(item) === identity)) {
      rejectedCandidates.push(rejectCandidate(candidate, "catalog-duplicate"));
      continue;
    }
    if (knownIdentities.has(identity)) {
      rejectedCandidates.push(rejectCandidate(candidate, "artifact-duplicate"));
      continue;
    }

    knownIdentities.add(identity);
    acceptedCandidates.push({
      word: candidate.word.trim().toLowerCase(),
      pos: candidate.pos.trim().toLowerCase(),
      cefrLevel: candidate.cefrLevel.trim().toUpperCase(),
    });
  }

  return {
    ...artifact,
    requestedCount: acceptedCandidates.length,
    candidates: acceptedCandidates,
    rejected: rejectedCandidates,
  };
}

export function applyTopicCandidateReview(
  artifact: TopicCandidateArtifact,
  decisions: TopicCandidateReviewDecision[]
): TopicCandidateArtifact {
  const decisionsByIdentity = new Map(
    decisions
      .filter(hasCandidateIdentityFields)
      .map((decision) => [candidateIdentity(decision), decision])
  );
  const reviewedCandidates: TopicCandidate[] = [];
  const rejectedCandidates: RejectedTopicCandidate[] = [...artifact.rejected];

  for (const candidate of artifact.candidates) {
    const decision = decisionsByIdentity.get(candidateIdentity(candidate));
    if (!decision || decision.decision === "core") {
      reviewedCandidates.push({ ...candidate, tier: "core" });
      continue;
    }
    if (decision.decision === "supporting") {
      reviewedCandidates.push({ ...candidate, tier: "supporting" });
      continue;
    }
    rejectedCandidates.push(
      rejectCandidate(candidate, `review:${decision.reason}`)
    );
  }

  return {
    ...artifact,
    requestedCount: reviewedCandidates.length,
    candidates: reviewedCandidates,
    rejected: rejectedCandidates,
  };
}

export function validateExpansionArtifact(
  catalog: VocabularyCatalogItem[],
  artifact: TopicExpansionArtifact,
  topics: VocabularyTopicDefinition[]
): ExpansionValidationResult {
  const errors: string[] = [];
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  if (!topicSlugs.has(artifact.targetTopicSlug)) {
    errors.push(`Unknown target topic "${artifact.targetTopicSlug}"`);
  }

  if (artifact.words.length !== artifact.requestedCount) {
    errors.push(
      `Expansion for "${artifact.targetTopicSlug}" requires exactly ${artifact.requestedCount} words`
    );
  }

  const catalogIdentities = new Set(catalog.map(vocabularyIdentity));
  const artifactIdentities = new Set<string>();
  let hasMalformedRequiredFields = false;
  for (const [index, word] of artifact.words.entries()) {
    const label = vocabularyLabel(word, index);
    for (const field of requiredVocabularyStringFields) {
      if (!isNonEmptyString(word[field])) {
        hasMalformedRequiredFields = true;
        errors.push(
          `Vocabulary "${label}" has invalid required field "${field}"`
        );
      }
    }

    const identity = hasIdentityFields(word) ? vocabularyIdentity(word) : label;
    if (hasIdentityFields(word)) {
      if (catalogIdentities.has(identity)) {
        errors.push(`Vocabulary "${identity}" already exists in catalog`);
      }
      if (artifactIdentities.has(identity)) {
        errors.push(`Duplicate expansion vocabulary identity "${identity}"`);
      }
      artifactIdentities.add(identity);
    }

    const wordTopics = Array.isArray(word.topics) ? word.topics : [];
    if (wordTopics.length !== 1 || wordTopics[0] !== artifact.targetTopicSlug) {
      errors.push(
        `Vocabulary "${identity}" must reference target topic "${artifact.targetTopicSlug}"`
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
    if (
      !isNonEmptyString(word.exampleEn) ||
      !isNonEmptyString(word.exampleVi)
    ) {
      errors.push(`Vocabulary "${identity}" requires bilingual example text`);
    }
    const examples = Array.isArray(word.examples) ? word.examples : [];
    const hasBilingualExamples = examples.every(
      (example) =>
        typeof example === "object" &&
        example !== null &&
        typeof example.exampleEn === "string" &&
        example.exampleEn.trim().length > 0 &&
        typeof example.exampleVi === "string" &&
        example.exampleVi.trim().length > 0
    );
    if (examples.length !== artifact.examplesPerWord || !hasBilingualExamples) {
      errors.push(
        `Vocabulary "${identity}" requires exactly ${artifact.examplesPerWord} bilingual examples`
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
        (!isNonEmptyString(word.exampleEn) ||
          !isNonEmptyString(word.exampleVi) ||
          word.exampleEn.trim() !== firstExample.exampleEn.trim() ||
          word.exampleVi.trim() !== firstExample.exampleVi.trim())
      ) {
        errors.push(
          `Vocabulary "${identity}" must use its first bilingual example as the primary example`
        );
      }
      const distinctExamples = new Set(
        bilingualExamples.map(
          (example) =>
            `${example.exampleEn.trim().toLowerCase()}|${example.exampleVi.trim().toLowerCase()}`
        )
      );
      if (distinctExamples.size !== bilingualExamples.length) {
        errors.push(
          `Vocabulary "${identity}" requires distinct bilingual examples`
        );
      }
    }
  }

  if (!hasMalformedRequiredFields) {
    const sourceReport = validateVocabularySources(topics, artifact.words);
    errors.push(...sourceReport.errors);
  } else {
    const sourceReadyWords = artifact.words.filter(hasCatalogRequiredFields);
    if (sourceReadyWords.length > 0) {
      const sourceReport = validateVocabularySources(topics, sourceReadyWords);
      errors.push(...sourceReport.errors);
    }
  }
  return { errors };
}

export function mergeAcceptedExpansion(
  catalog: VocabularyCatalogItem[],
  artifact: TopicExpansionArtifact,
  topics: VocabularyTopicDefinition[]
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
