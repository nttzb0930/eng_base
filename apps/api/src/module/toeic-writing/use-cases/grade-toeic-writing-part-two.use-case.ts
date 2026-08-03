import { createHash } from "node:crypto";

import type {
  ToeicWritingPartTwoGradeRequest,
  ToeicWritingPartTwoGradeResult,
} from "@repo/shared";

import { mapPartTwoGradeRecord } from "../grading/part-two-grade.mapper";
import { validatePartTwoProviderResult } from "../grading/part-two-provider-result.validator";
import type { WritingAiProvider } from "../provider/writing-ai-provider";
import type { WritingAiRepository } from "../repository/writing-ai.repository";
import {
  mapWritingAiError,
  writingContentVersionConflict,
  writingResponseInvalid,
} from "../toeic-writing.errors";
import { validatePartTwoResponse } from "../validation/part-two-response.validator";

const PROMPT_VERSION = "toeic-writing-part2-v1";
const RUBRIC_VERSION = "toeic-writing-part2-rubric-v1";

export type WritingPartTwoTask = {
  id: number;
  contentVersion: string;
  sourceEmail: string;
  requirements: Array<{
    id: string;
    textEn: string;
    textVi: string | null;
  }>;
};

export interface WritingPartTwoTaskSource {
  getPublishedPartTwo(taskId: number): Promise<WritingPartTwoTask>;
}

type GradeConfiguration = {
  dailyLimit: number;
  reservationTtlMs: number;
  gradingModel: string;
};

function responseHash(responseText: string): string {
  return createHash("sha256")
    .update(responseText.normalize("NFKC").trim(), "utf8")
    .digest("hex");
}

export class GradeToeicWritingPartTwoUseCase {
  constructor(
    private readonly tasks: WritingPartTwoTaskSource,
    private readonly repository: WritingAiRepository,
    private readonly provider: Pick<WritingAiProvider, "gradePartTwo">,
    private readonly configuration: GradeConfiguration
  ) {}

  async execute(
    userId: string,
    taskId: number,
    request: ToeicWritingPartTwoGradeRequest
  ): Promise<ToeicWritingPartTwoGradeResult> {
    const task = await this.tasks.getPublishedPartTwo(taskId);
    if (task.contentVersion !== request.contentVersion) {
      return writingContentVersionConflict();
    }
    const validation = validatePartTwoResponse(request.responseText);
    if (!validation.valid) return writingResponseInvalid(validation.issues);

    const hash = responseHash(request.responseText);
    const cacheKey = {
      userId,
      taskId,
      contentVersion: task.contentVersion,
      responseHash: hash,
      promptVersion: PROMPT_VERSION,
    };
    const cached = await this.repository.findOwnedCachedGrade(cacheKey);
    if (cached) {
      return mapPartTwoGradeRecord(
        cached,
        await this.repository.getQuota(
          userId,
          "TOEIC_WRITING",
          this.configuration.dailyLimit
        ),
        true
      );
    }

    let reservation;
    try {
      reservation = await this.repository.reserveQuota({
        userId,
        feature: "TOEIC_WRITING",
        idempotencyKey: request.idempotencyKey,
        responseHash: hash,
        dailyLimit: this.configuration.dailyLimit,
        reservationTtlMs: this.configuration.reservationTtlMs,
      });
    } catch (error) {
      return mapWritingAiError(error);
    }

    try {
      const assistance = await this.repository.getAssistanceSnapshot({
        userId,
        taskId,
        contentVersion: task.contentVersion,
      });
      const verified = validatePartTwoProviderResult(
        await this.provider.gradePartTwo({
          locale: request.locale,
          sourceEmail: task.sourceEmail,
          requirements: task.requirements,
          responseText: request.responseText,
          assistance,
        }),
        {
          responseText: request.responseText,
          requirementIds: task.requirements.map(({ id }) => id),
        }
      );
      const saved = await this.repository.saveGradeAndCompleteQuota({
        ...cacheKey,
        reservationId: reservation.id,
        responseText: request.responseText,
        part: 2,
        locale: request.locale,
        model: this.configuration.gradingModel,
        rubricVersion: RUBRIC_VERSION,
        assistance,
        result: verified as unknown as Record<string, unknown>,
        contextSource: null,
      });
      return mapPartTwoGradeRecord(
        saved,
        await this.repository.getQuota(
          userId,
          "TOEIC_WRITING",
          this.configuration.dailyLimit
        ),
        false
      );
    } catch (error) {
      await this.repository.releaseQuota(reservation.id);
      return mapWritingAiError(error);
    }
  }
}
