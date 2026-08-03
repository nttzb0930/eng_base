import type {
  ToeicWritingCoachingKind,
  ToeicWritingCoachingSectionKind,
  ToeicWritingPartTwoCoaching,
  ToeicWritingSampleSection,
} from "@repo/shared";

import type { WritingAiRepository } from "../repository/writing-ai.repository";
import {
  writingCoachingUnavailable,
  writingContentVersionConflict,
} from "../toeic-writing.errors";
import { parsePartTwoPayload } from "../toeic-writing.mapper";

export type WritingCoachingTask = {
  id: number;
  part: number;
  contentVersion: string;
  payload: unknown;
};

export interface WritingCoachingTaskSource {
  getPublishedCoachingTask(taskId: number): Promise<WritingCoachingTask>;
}

const SECTION_KINDS = ["OPENING", "BODY", "ENDING"] as const;

function outlineSections(values: string[]) {
  const sections = new Map<ToeicWritingCoachingSectionKind, string[]>(
    SECTION_KINDS.map((kind) => [kind, []])
  );
  let active: ToeicWritingCoachingSectionKind = "BODY";
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const marker = value.toUpperCase();
    if (SECTION_KINDS.includes(marker as ToeicWritingCoachingSectionKind)) {
      active = marker as ToeicWritingCoachingSectionKind;
    } else {
      sections.get(active)?.push(value);
    }
  }
  return SECTION_KINDS.map((kind) => ({ kind, items: sections.get(kind)! }));
}

function paragraphs(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n\s*\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function paragraphKinds(length: number): ToeicWritingCoachingSectionKind[] {
  if (length === 0) return [];
  if (length === 1) return ["BODY"];
  if (length === 2) return ["OPENING", "ENDING"];
  return ["OPENING", ...Array.from({ length: length - 2 }, () => "BODY" as const), "ENDING"];
}

function sampleStructure(
  sampleEn: string,
  sampleVi: string | null
): ToeicWritingSampleSection[] {
  const english = paragraphs(sampleEn);
  const vietnamese = paragraphs(sampleVi);
  return paragraphKinds(english.length).map((kind, index) => ({
    kind,
    textEn: english[index]!,
    textVi: vietnamese[index] ?? null,
  }));
}

export class GetToeicWritingCoachingUseCase {
  constructor(
    private readonly tasks: WritingCoachingTaskSource,
    private readonly repository: Pick<
      WritingAiRepository,
      "recordAssistance" | "getAssistanceSnapshot"
    >
  ) {}

  async execute(
    userId: string,
    taskId: number,
    kind: ToeicWritingCoachingKind,
    contentVersion: string
  ): Promise<ToeicWritingPartTwoCoaching> {
    const task = await this.tasks.getPublishedCoachingTask(taskId);
    if (task.part !== 2) return writingCoachingUnavailable();
    if (task.contentVersion !== contentVersion) {
      return writingContentVersionConflict();
    }
    const payload = parsePartTwoPayload(task.payload);

    await this.repository.recordAssistance({
      userId,
      taskId,
      contentVersion,
      kind,
    });
    const assistance = await this.repository.getAssistanceSnapshot({
      userId,
      taskId,
      contentVersion,
    });
    const base = { taskId, contentVersion, assistance };

    if (kind === "OUTLINE") {
      return {
        ...base,
        kind,
        variants: [
          { level: 1, sections: outlineSections(payload.outlineLevel1) },
          { level: 2, sections: outlineSections(payload.outlineLevel2) },
        ],
      };
    }
    if (kind === "VOCABULARY") {
      const variant = (level: 1 | 2, values: string[]) => ({
        level,
        items: values.map((patternEn) => ({
          patternEn,
          meaningVi: null,
          exampleEn: null,
          exampleVi: null,
        })),
      });
      return {
        ...base,
        kind,
        variants: [
          variant(1, payload.chunksLevel1),
          variant(2, payload.chunksLevel2),
        ],
      };
    }
    return {
      ...base,
      kind,
      sampleEn: payload.sampleEn,
      sampleVi: payload.sampleVi,
      structure: sampleStructure(payload.sampleEn, payload.sampleVi),
    };
  }
}
