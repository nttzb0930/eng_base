import { createHash } from "node:crypto";

import { z } from "zod";

import type {
  GrammarSnapshotContent,
  GrammarValidationResult,
  ToeicGrammarQuestion,
  ToeicGrammarSnapshot,
} from "./toeic-grammar.types.js";

const requiredText = z.string().trim().min(1);
const nullableText = z.string().trim().min(1).nullable();
const optionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: requiredText,
  correct: z.boolean(),
});
const questionSchema = z.object({
  sourceQuestionId: requiredText,
  sourceTopicId: nullableText,
  sourceSubtopicId: nullableText,
  questionNumber: z.number().int().positive().nullable(),
  questionText: requiredText,
  options: z.array(optionSchema).length(4),
  explanationVi: nullableText,
  explanationEn: nullableText,
  questionTranslation: nullableText,
  answerTranslation: nullableText,
  vocabulary: z.array(z.unknown()),
  preferAiExplanation: z.boolean(),
});
const topicSchema = z.object({
  sourceTopicId: requiredText,
  titleEn: nullableText,
  titleVi: requiredText,
  descriptionVi: nullableText,
  icon: nullableText,
  orderIndex: z.number().int(),
});
const subtopicSchema = z.object({
  sourceSubtopicId: requiredText,
  sourceTopicId: requiredText,
  titleEn: nullableText,
  titleVi: requiredText,
  descriptionVi: nullableText,
  accessLevel: nullableText,
  orderIndex: z.number().int(),
});
const setSchema = z.object({
  sourceSetId: requiredText,
  name: requiredText,
  year: z.number().int().nullable(),
  accessLevel: nullableText,
  questionIds: z.array(requiredText),
});
const difficultySchema = z.object({
  level: z.number().int().min(1).max(5),
  questionIds: z.array(requiredText),
});
const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.literal("dautoeic"),
  snapshotVersion: requiredText,
  inventorySha256: z.string().regex(/^[a-f0-9]{64}$/u),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  topics: z.array(topicSchema),
  subtopics: z.array(subtopicSchema),
  questions: z.array(questionSchema),
  sets: z.array(setSchema),
  difficultyLevels: z.array(difficultySchema),
});

function unique(values: string[]) {
  return [...new Set(values)];
}

function coreQuestion(value: ToeicGrammarQuestion) {
  return JSON.stringify({
    questionText: value.questionText,
    options: [...value.options].sort((a, b) => a.label.localeCompare(b.label)),
  });
}

function mergeQuestion(
  current: ToeicGrammarQuestion,
  next: ToeicGrammarQuestion
) {
  if (coreQuestion(current) !== coreQuestion(next)) {
    throw new Error(
      `Question ${current.sourceQuestionId} has conflicting duplicate content`
    );
  }
  const richer = <T>(left: T | null, right: T | null) => left ?? right;
  return {
    ...current,
    sourceTopicId: richer(current.sourceTopicId, next.sourceTopicId),
    sourceSubtopicId: richer(current.sourceSubtopicId, next.sourceSubtopicId),
    questionNumber: richer(current.questionNumber, next.questionNumber),
    explanationVi: richer(current.explanationVi, next.explanationVi),
    explanationEn: richer(current.explanationEn, next.explanationEn),
    questionTranslation: richer(
      current.questionTranslation,
      next.questionTranslation
    ),
    answerTranslation: richer(current.answerTranslation, next.answerTranslation),
    vocabulary:
      current.vocabulary.length > 0 ? current.vocabulary : next.vocabulary,
    preferAiExplanation:
      current.preferAiExplanation || next.preferAiExplanation,
  };
}

function normalizedContent(value: unknown): GrammarSnapshotContent {
  const parsed = snapshotSchema.parse(value);
  const questions = new Map<string, ToeicGrammarQuestion>();
  for (const item of parsed.questions) {
    const current = questions.get(item.sourceQuestionId);
    questions.set(
      item.sourceQuestionId,
      current ? mergeQuestion(current, item) : item
    );
  }

  const topics = [...parsed.topics].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      a.sourceTopicId.localeCompare(b.sourceTopicId)
  );
  const subtopics = [...parsed.subtopics].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      a.sourceSubtopicId.localeCompare(b.sourceSubtopicId)
  );
  const canonicalQuestions = [...questions.values()]
    .map((question) => ({
      ...question,
      options: [...question.options].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    }))
    .sort(
      (a, b) =>
        (a.questionNumber ?? Number.MAX_SAFE_INTEGER) -
          (b.questionNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.sourceQuestionId.localeCompare(b.sourceQuestionId)
    );
  const sets = [...parsed.sets]
    .map((set) => ({ ...set, questionIds: unique(set.questionIds) }))
    .sort((a, b) => a.sourceSetId.localeCompare(b.sourceSetId));
  const difficultyLevels = [...parsed.difficultyLevels]
    .map((level) => ({ ...level, questionIds: unique(level.questionIds) }))
    .sort((a, b) => a.level - b.level);

  return {
    schemaVersion: 1,
    source: "dautoeic",
    snapshotVersion: parsed.snapshotVersion,
    inventorySha256: parsed.inventorySha256,
    topics,
    subtopics,
    questions: canonicalQuestions,
    sets,
    difficultyLevels,
  };
}

function assertInvariants(value: GrammarSnapshotContent) {
  const topicIds = new Set(value.topics.map((topic) => topic.sourceTopicId));
  const subtopics = new Map(
    value.subtopics.map((subtopic) => [subtopic.sourceSubtopicId, subtopic])
  );
  const questionIds = new Set(
    value.questions.map((question) => question.sourceQuestionId)
  );

  for (const subtopic of value.subtopics) {
    if (!topicIds.has(subtopic.sourceTopicId)) {
      throw new Error(`Subtopic ${subtopic.sourceSubtopicId} has unknown topic`);
    }
  }
  for (const question of value.questions) {
    const labels = new Set(question.options.map((option) => option.label));
    if (labels.size !== 4) {
      throw new Error(`Question ${question.sourceQuestionId} has duplicate labels`);
    }
    if (question.options.filter((option) => option.correct).length !== 1) {
      throw new Error(
        `Question ${question.sourceQuestionId} must have exactly one correct option`
      );
    }
    if (question.sourceTopicId && !topicIds.has(question.sourceTopicId)) {
      throw new Error(`Question ${question.sourceQuestionId} has unknown topic`);
    }
    if (question.sourceSubtopicId) {
      const subtopic = subtopics.get(question.sourceSubtopicId);
      if (!subtopic) {
        throw new Error(
          `Question ${question.sourceQuestionId} has unknown subtopic`
        );
      }
      if (
        question.sourceTopicId &&
        subtopic.sourceTopicId !== question.sourceTopicId
      ) {
        throw new Error(
          `Question ${question.sourceQuestionId} topic and subtopic disagree`
        );
      }
    }
  }
  for (const set of value.sets) {
    for (const questionId of set.questionIds) {
      if (!questionIds.has(questionId)) {
        throw new Error(`Set ${set.sourceSetId} has unknown question`);
      }
    }
  }
  for (const difficulty of value.difficultyLevels) {
    for (const questionId of difficulty.questionIds) {
      if (!questionIds.has(questionId)) {
        throw new Error(`Level ${difficulty.level} has unknown question`);
      }
    }
  }
}

export function grammarContentSha256(value: GrammarSnapshotContent) {
  const { contentSha256: _ignored, ...content } = value;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function normalizeGrammarSnapshot(value: unknown): ToeicGrammarSnapshot {
  const content = normalizedContent(value);
  assertInvariants(content);
  return { ...content, contentSha256: grammarContentSha256(content) };
}

export function validateGrammarSnapshot(value: unknown): GrammarValidationResult {
  try {
    return { valid: true, errors: [], snapshot: normalizeGrammarSnapshot(value) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map(
          (issue) => `${issue.path.join(".") || "snapshot"}: ${issue.message}`
        ),
      };
    }
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Invalid snapshot"],
    };
  }
}
