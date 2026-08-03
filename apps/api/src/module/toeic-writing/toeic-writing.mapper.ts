import type {
  ToeicWritingPartOneReference,
  ToeicWritingPartTwoReference,
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
  content_sha256: string;
};

export type ToeicWritingDetailRecord = ToeicWritingSummaryRecord & {
  instructions_en: string;
  instructions_vi: string | null;
  payload: unknown;
};

type PartOnePayload = {
  requiredWords: Array<{ en: string; vi: string | null }>;
  structureSuggestions: string[];
  ideas: string[];
  samplesEn: string[];
  samplesVi: string[];
};

type PartTwoPayload = {
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
  sampleEn: string;
  sampleVi: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parsePartOnePayload(value: unknown): PartOnePayload {
  if (!isObject(value) || !Array.isArray(value.requiredWords)) {
    return writingTaskNotFound();
  }
  const requiredWords = value.requiredWords;
  if (
    !requiredWords.every(
      (word) =>
        isObject(word) &&
        typeof word.en === "string" &&
        nullableString(word.vi)
    ) ||
    !stringArray(value.structureSuggestions) ||
    !stringArray(value.ideas) ||
    !stringArray(value.samplesEn) ||
    !stringArray(value.samplesVi)
  ) {
    return writingTaskNotFound();
  }
  return {
    requiredWords: requiredWords.map((word) => ({
      en: word.en as string,
      vi: word.vi as string | null,
    })),
    structureSuggestions: value.structureSuggestions,
    ideas: value.ideas,
    samplesEn: value.samplesEn,
    samplesVi: value.samplesVi,
  };
}

function parsePartTwoPayload(value: unknown): PartTwoPayload {
  if (
    !isObject(value) ||
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
  return value as PartTwoPayload;
}

export function mapToeicWritingTaskSummary(
  task: ToeicWritingSummaryRecord
): ToeicWritingTaskSummary {
  if (
    (task.part !== 1 && task.part !== 2) ||
    (task.difficulty !== "EASY" && task.difficulty !== "MEDIUM")
  ) {
    return writingTaskNotFound();
  }
  return {
    id: task.id,
    part: task.part,
    order: task.order_index,
    title: task.title,
    difficulty: task.difficulty,
    contentVersion: task.content_sha256,
    submitted: task.submissions.length > 0,
    hasDraft: task.drafts.length > 0,
  };
}

export function mapToeicWritingExercise(
  task: ToeicWritingDetailRecord
): ToeicWritingTaskDetail {
  const summary = mapToeicWritingTaskSummary(task);
  if (task.part === 1) {
    const payload = parsePartOnePayload(task.payload);
    return {
      ...summary,
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
    ...summary,
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
