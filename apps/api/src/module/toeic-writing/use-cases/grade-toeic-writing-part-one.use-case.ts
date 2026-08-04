import { createHash } from "node:crypto";

import type {
  ToeicWritingPartOneGradeRequest,
  ToeicWritingPartOneGradeResult,
} from "@repo/shared";

import { writingPartOneProviderResultSchema } from "../provider/writing-ai.schemas";
import type {
  WritingAiProvider,
  WritingImageMimeType,
  WritingPictureContext,
} from "../provider/writing-ai-provider";
import type {
  WritingAiGradeRecord,
  WritingAiRepository,
} from "../repository/writing-ai.repository";
import {
  writingContentVersionConflict,
  mapWritingAiError,
  writingResponseInvalid,
} from "../toeic-writing.errors";
import { validatePartOneResponse } from "../validation/part-one-response.validator";
import type {
  WritingAiEvent,
  WritingAiObservabilityService,
} from "../observability/writing-ai-observability.service";

const PROMPT_VERSION = "toeic-writing-part1-v1";
const RUBRIC_VERSION = "toeic-writing-part1-rubric-v1";

export type WritingPartOneTask = {
  id: number;
  contentVersion: string;
  requiredWords: string[];
  imageSha256: string;
  imageStoragePath: string;
  imageMimeType: WritingImageMimeType;
};

export interface WritingPartOneTaskSource {
  getPublishedPartOne(taskId: number): Promise<WritingPartOneTask>;
}

export type ResolvedWritingPicture =
  | { source: "ENRICHED"; context: WritingPictureContext }
  | {
      source: "DIRECT_IMAGE";
      imageBytes: Uint8Array;
      mimeType: WritingImageMimeType;
    };

export interface WritingPictureResolver {
  resolve(task: WritingPartOneTask): Promise<ResolvedWritingPicture>;
}

type GradeConfiguration = {
  dailyLimit: number;
  reservationTtlMs: number;
  gradingModel: string;
};

function latencyBucket(startedAt: number): WritingAiEvent["latencyBucket"] {
  const elapsed = Date.now() - startedAt;
  if (elapsed < 1_000) return "LT_1S";
  if (elapsed < 5_000) return "1_5S";
  if (elapsed < 20_000) return "5_20S";
  return "GT_20S";
}

function responseHash(responseText: string): string {
  return createHash("sha256")
    .update(responseText.normalize("NFKC").trim(), "utf8")
    .digest("hex");
}

export function mapPartOneGradeRecord(
  record: WritingAiGradeRecord,
  quota: ToeicWritingPartOneGradeResult["quota"],
  cached: boolean
): ToeicWritingPartOneGradeResult {
  const result = writingPartOneProviderResultSchema.parse(record.result);
  return {
    id: record.id,
    taskId: record.taskId,
    ...result,
    quota,
    cached,
    assistance: record.assistance,
  };
}

export class GradeToeicWritingPartOneUseCase {
  constructor(
    private readonly tasks: WritingPartOneTaskSource,
    private readonly repository: WritingAiRepository,
    private readonly provider: Pick<WritingAiProvider, "gradePartOne">,
    private readonly pictures: WritingPictureResolver,
    private readonly configuration: GradeConfiguration,
    private readonly observability?: Pick<WritingAiObservabilityService, "record">
  ) {}

  async execute(
    userId: string,
    taskId: number,
    request: ToeicWritingPartOneGradeRequest
  ): Promise<ToeicWritingPartOneGradeResult> {
    const task = await this.tasks.getPublishedPartOne(taskId);
    if (task.contentVersion !== request.contentVersion) {
      return writingContentVersionConflict();
    }
    const validation = validatePartOneResponse({
      responseText: request.responseText,
      requiredWords: task.requiredWords,
    });
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
      this.observability?.record({
        name: "grade_completed",
        part: 1,
        model: cached.model,
        promptVersion: cached.promptVersion,
        outcome: "SUCCESS",
        cacheHit: true,
        quotaCharged: false,
      });
      return mapPartOneGradeRecord(
        cached,
        await this.repository.getQuota(
          userId,
          "TOEIC_WRITING",
          this.configuration.dailyLimit
        ),
        true
      );
    }

    const startedAt = Date.now();
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
      const picture = await this.pictures.resolve(task);
      this.observability?.record({
        name: "context_resolved",
        part: 1,
        model: this.configuration.gradingModel,
        promptVersion: PROMPT_VERSION,
        contextSource: picture.source,
        outcome: "SUCCESS",
      });
      const checked = writingPartOneProviderResultSchema.parse(
        await this.provider.gradePartOne({
          locale: request.locale,
          responseText: request.responseText,
          requiredWords: task.requiredWords,
          picture,
        })
      );
      const saved = await this.repository.saveGradeAndCompleteQuota({
        ...cacheKey,
        reservationId: reservation.id,
        responseText: request.responseText,
        part: 1,
        locale: request.locale,
        model: this.configuration.gradingModel,
        rubricVersion: RUBRIC_VERSION,
        assistance,
        result: checked,
        contextSource: picture.source,
      });
      this.observability?.record({
        name: "grade_completed",
        part: 1,
        model: this.configuration.gradingModel,
        promptVersion: PROMPT_VERSION,
        contextSource: picture.source,
        latencyBucket: latencyBucket(startedAt),
        outcome: "SUCCESS",
        schemaRepairUsed: false,
        cacheHit: false,
        quotaCharged: true,
      });
      return mapPartOneGradeRecord(
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
      this.observability?.record({
        name: "grade_failed",
        part: 1,
        model: this.configuration.gradingModel,
        promptVersion: PROMPT_VERSION,
        latencyBucket: latencyBucket(startedAt),
        outcome: "FAILURE",
        cacheHit: false,
        quotaCharged: false,
      });
      return mapWritingAiError(error);
    }
  }
}
