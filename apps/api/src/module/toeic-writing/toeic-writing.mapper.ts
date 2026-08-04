import type {
  ToeicWritingDifficulty,
  ToeicWritingPartOneReference,
  ToeicWritingPartTwoReference,
  ToeicWritingSubmissionResult,
  ToeicWritingTaskDetail,
  ToeicWritingTaskSummary,
} from "@repo/shared";

import { writingTaskNotFound } from "./toeic-writing.errors";

type LearnerState = {
  drafts: Array<{ id: number }>;
  submissions: Array<{ id: number }>;
};

export type ToeicWritingSummaryRecord = LearnerState & {
  id: number;
  part: number;
  order_index: number;
  title: string;
  difficulty: string;
  source_version: string;
  payload: unknown;
};

export type ToeicWritingDetailRecord = ToeicWritingSummaryRecord & {
  instructions_en: string;
  instructions_vi: string | null;
  payload: unknown;
};

export type ToeicWritingSubmissionRecord = {
  id: number;
  task_id: number;
  content_version: string;
  response_text: string;
  submitted_at: Date;
  task_title: string;
  task_part: number;
  reference_snapshot: unknown;
};

type PartOnePayload = {
  requiredWords: Array<{ en: string; vi: string | null }>;
  pattern: string | null;
  structureSuggestions: string[];
  ideas: string[];
  samplesEn: string[];
  samplesVi: string[];
};

export type PartTwoPayload = {
  titleVi: string | null;
  promptEn: string;
  promptVi: string | null;
  requirements: Array<{
    order: number;
    textEn: string;
    textVi: string | null;
  }>;
  outlineLevel1: string[];
  outlineLevel2: string[];
  chunksLevel1: string[];
  chunksLevel2: string[];
  chunkDetailsLevel1?: Array<{ patternEn: string; meaningVi: string | null; exampleEn: string | null; exampleVi: string | null }>;
  chunkDetailsLevel2?: Array<{ patternEn: string; meaningVi: string | null; exampleEn: string | null; exampleVi: string | null }>;
  sampleEn: string;
  sampleVi: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nullableOptionalString(
  value: unknown
): value is string | null | undefined {
  return value === undefined || nullableString(value);
}

function parsePartOnePayload(value: unknown): PartOnePayload {
  if (!isObject(value) || !Array.isArray(value.requiredWords)) {
    return writingTaskNotFound();
  }
  const requiredWords = value.requiredWords;
  if (
    !requiredWords.every(
      (word) =>
        isObject(word) && typeof word.en === "string" && nullableString(word.vi)
    ) ||
    !stringArray(value.structureSuggestions) ||
    !stringArray(value.ideas) ||
    !stringArray(value.samplesEn) ||
    !stringArray(value.samplesVi) ||
    !nullableOptionalString(value.pattern)
  ) {
    return writingTaskNotFound();
  }
  return {
    requiredWords: requiredWords.map((word) => ({
      en: word.en as string,
      vi: word.vi as string | null,
    })),
    pattern: value.pattern?.trim() || null,
    structureSuggestions: value.structureSuggestions,
    ideas: value.ideas,
    samplesEn: value.samplesEn,
    samplesVi: value.samplesVi,
  };
}

export function parsePartTwoPayload(value: unknown): PartTwoPayload {
  if (
    !isObject(value) ||
    !nullableOptionalString(value.titleVi) ||
    typeof value.promptEn !== "string" ||
    !nullableString(value.promptVi) ||
    !Array.isArray(value.requirements) ||
    !value.requirements.every(
      (requirement) =>
        isObject(requirement) &&
        Number.isInteger(requirement.order) &&
        typeof requirement.textEn === "string" &&
        nullableString(requirement.textVi)
    ) ||
    !stringArray(value.outlineLevel1) ||
    !stringArray(value.outlineLevel2) ||
    !stringArray(value.chunksLevel1) ||
    !stringArray(value.chunksLevel2) ||
    typeof value.sampleEn !== "string" ||
    !nullableString(value.sampleVi)
  ) {
    return writingTaskNotFound();
  }
  return {
    ...(value as Omit<PartTwoPayload, "titleVi">),
    titleVi: value.titleVi?.trim() || null,
    chunkDetailsLevel1: Array.isArray(value.chunkDetailsLevel1) ? value.chunkDetailsLevel1 as PartTwoPayload["chunkDetailsLevel1"] : undefined,
    chunkDetailsLevel2: Array.isArray(value.chunkDetailsLevel2) ? value.chunkDetailsLevel2 as PartTwoPayload["chunkDetailsLevel2"] : undefined,
  };
}

function mapToeicWritingTaskBase(task: ToeicWritingSummaryRecord): {
  id: number;
  order: number;
  difficulty: ToeicWritingDifficulty;
  contentVersion: string;
  submitted: boolean;
  hasDraft: boolean;
} {
  if (
    (task.part !== 1 && task.part !== 2) ||
    (task.difficulty !== "EASY" && task.difficulty !== "MEDIUM")
  ) {
    return writingTaskNotFound();
  }
  return {
    id: task.id,
    order: task.order_index,
    difficulty: task.difficulty,
    contentVersion: task.source_version,
    submitted: task.submissions.length > 0,
    hasDraft: task.drafts.length > 0,
  };
}

export function mapToeicWritingTaskSummary(
  task: ToeicWritingSummaryRecord
): ToeicWritingTaskSummary {
  const base = mapToeicWritingTaskBase(task);
  if (task.part === 1) {
    const payload = parsePartOnePayload(task.payload);
    return {
      ...base,
      part: 1,
      requiredWords: payload.requiredWords,
      pattern: payload.pattern,
    };
  }
  const payload = parsePartTwoPayload(task.payload);
  return {
    ...base,
    part: 2,
    title: task.title,
    titleVi: payload.titleVi,
  };
}

export function mapToeicWritingExercise(
  task: ToeicWritingDetailRecord
): ToeicWritingTaskDetail {
  const detailBase = {
    ...mapToeicWritingTaskBase(task),
    title: task.title,
  };
  if (task.part === 1) {
    const payload = parsePartOnePayload(task.payload);
    return {
      ...detailBase,
      part: 1,
      exercise: {
        imageUrl: `/api/toeic/writing/tasks/${task.id}/image`,
        instructionsEn: task.instructions_en,
        instructionsVi: task.instructions_vi,
        requiredWords: payload.requiredWords,
      },
    };
  }
  const payload = parsePartTwoPayload(task.payload);
  return {
    ...detailBase,
    part: 2,
    exercise: {
      promptEn: payload.promptEn,
      promptVi: payload.promptVi,
      requirements: payload.requirements,
    },
  };
}

export function mapToeicWritingReference(
  task: Pick<ToeicWritingDetailRecord, "part" | "payload">
): ToeicWritingPartOneReference | ToeicWritingPartTwoReference {
  if (task.part === 1) {
    const payload = parsePartOnePayload(task.payload);
    return {
      samplesEn: payload.samplesEn,
      samplesVi: payload.samplesVi,
      structureSuggestions: payload.structureSuggestions,
      ideas: payload.ideas,
    };
  }
  if (task.part !== 2) return writingTaskNotFound();
  const payload = parsePartTwoPayload(task.payload);
  return {
    sampleEn: payload.sampleEn,
    sampleVi: payload.sampleVi,
    outlineLevel1: payload.outlineLevel1,
    outlineLevel2: payload.outlineLevel2,
    chunksLevel1: payload.chunksLevel1,
    chunksLevel2: payload.chunksLevel2,
  };
}

function parseToeicWritingReferenceSnapshot(
  part: number,
  value: unknown
): ToeicWritingPartOneReference | ToeicWritingPartTwoReference {
  if (!isObject(value)) return writingTaskNotFound();
  if (part === 1) {
    if (
      !stringArray(value.samplesEn) ||
      !stringArray(value.samplesVi) ||
      !stringArray(value.structureSuggestions) ||
      !stringArray(value.ideas)
    ) {
      return writingTaskNotFound();
    }
    return {
      samplesEn: value.samplesEn,
      samplesVi: value.samplesVi,
      structureSuggestions: value.structureSuggestions,
      ideas: value.ideas,
    };
  }
  if (
    part !== 2 ||
    typeof value.sampleEn !== "string" ||
    !nullableString(value.sampleVi) ||
    !stringArray(value.outlineLevel1) ||
    !stringArray(value.outlineLevel2) ||
    !stringArray(value.chunksLevel1) ||
    !stringArray(value.chunksLevel2)
  ) {
    return writingTaskNotFound();
  }
  return {
    sampleEn: value.sampleEn,
    sampleVi: value.sampleVi,
    outlineLevel1: value.outlineLevel1,
    outlineLevel2: value.outlineLevel2,
    chunksLevel1: value.chunksLevel1,
    chunksLevel2: value.chunksLevel2,
  };
}

export function mapToeicWritingSubmissionResult(
  submission: ToeicWritingSubmissionRecord
): ToeicWritingSubmissionResult {
  const base = {
    id: submission.id,
    taskId: submission.task_id,
    taskTitle: submission.task_title,
    contentVersion: submission.content_version,
    responseText: submission.response_text,
    submittedAt: submission.submitted_at.toISOString(),
  };
  if (submission.task_part === 1) {
    return {
      ...base,
      part: 1,
      reference: parseToeicWritingReferenceSnapshot(
        1,
        submission.reference_snapshot
      ) as ToeicWritingPartOneReference,
    };
  }
  if (submission.task_part !== 2) return writingTaskNotFound();
  return {
    ...base,
    part: 2,
    reference: parseToeicWritingReferenceSnapshot(
      2,
      submission.reference_snapshot
    ) as ToeicWritingPartTwoReference,
  };
}
