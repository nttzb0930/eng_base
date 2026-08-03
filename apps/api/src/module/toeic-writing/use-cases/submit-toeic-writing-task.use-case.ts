import { Injectable } from "@nestjs/common";
import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  type ToeicWritingSubmissionPayload,
  type ToeicWritingSubmissionResult,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  writingContentVersionConflict,
  writingResponseInvalid,
  writingSubmissionKeyConflict,
  writingTaskNotFound,
} from "../toeic-writing.errors";
import {
  mapToeicWritingReference,
  mapToeicWritingSubmissionResult,
  type ToeicWritingSubmissionRecord,
} from "../toeic-writing.mapper";

const writingSubmissionSelect = {
  id: true,
  task_id: true,
  content_version: true,
  response_text: true,
  submitted_at: true,
  task_title: true,
  task_part: true,
  reference_snapshot: true,
} as const;

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function resolveExisting(
  existing: ToeicWritingSubmissionRecord,
  taskId: number,
  payload: ToeicWritingSubmissionPayload
): ToeicWritingSubmissionResult {
  if (
    existing.task_id !== taskId ||
    existing.content_version !== payload.contentVersion ||
    existing.response_text !== payload.responseText
  ) {
    return writingSubmissionKeyConflict();
  }
  return mapToeicWritingSubmissionResult(existing);
}

@Injectable()
export class SubmitToeicWritingTaskUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private findByUserAndKey(userId: string, submissionKey: string) {
    return this.prisma.toeic_writing_submissions.findUnique({
      where: {
        user_id_submission_key: {
          user_id: userId,
          submission_key: submissionKey,
        },
      },
      select: writingSubmissionSelect,
    });
  }

  async execute(
    userId: string,
    taskId: number,
    payload: ToeicWritingSubmissionPayload
  ): Promise<ToeicWritingSubmissionResult> {
    const existing = await this.findByUserAndKey(
      userId,
      payload.submissionKey
    );
    if (existing) return resolveExisting(existing, taskId, payload);

    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: {
        id: true,
        part: true,
        title: true,
        payload: true,
        source_version: true,
      },
    });
    if (!task || (task.part !== 1 && task.part !== 2)) {
      return writingTaskNotFound();
    }
    const responseLength = getToeicWritingResponseLength(
      payload.responseText
    );
    if (
      responseLength === 0 ||
      responseLength > TOEIC_WRITING_RESPONSE_LIMITS[task.part]
    ) {
      return writingResponseInvalid();
    }
    if (task.source_version !== payload.contentVersion) {
      return writingContentVersionConflict();
    }
    const referenceSnapshot = mapToeicWritingReference({
      part: task.part,
      payload: task.payload,
    });

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const submission = await transaction.toeic_writing_submissions.create({
          data: {
            user_id: userId,
            task_id: taskId,
            submission_key: payload.submissionKey,
            response_text: payload.responseText,
            content_version: payload.contentVersion,
            task_title: task.title,
            task_part: task.part,
            reference_snapshot: referenceSnapshot,
          },
          select: writingSubmissionSelect,
        });
        await transaction.toeic_writing_drafts.deleteMany({
          where: { user_id: userId, task_id: taskId },
        });
        return submission;
      });
      return mapToeicWritingSubmissionResult(created);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const raced = await this.findByUserAndKey(
        userId,
        payload.submissionKey
      );
      if (!raced) throw error;
      return resolveExisting(raced, taskId, payload);
    }
  }
}
