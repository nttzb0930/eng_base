import { Injectable } from "@nestjs/common";
import type { ToeicWritingDraft, ToeicWritingDraftPayload } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  writingContentVersionConflict,
  writingResponseInvalid,
  writingTaskNotFound,
} from "../toeic-writing.errors";
import { mapToeicWritingDraft } from "./get-toeic-writing-draft.use-case";

const RESPONSE_LIMITS = { 1: 1_000, 2: 10_000 } as const;

@Injectable()
export class SaveToeicWritingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    taskId: number,
    payload: ToeicWritingDraftPayload
  ): Promise<ToeicWritingDraft> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, status: "PUBLISHED" },
      select: { id: true, part: true, source_version: true },
    });
    if (!task || (task.part !== 1 && task.part !== 2)) {
      return writingTaskNotFound();
    }

    const normalized = payload.responseText.trim();
    if (
      normalized.length === 0 ||
      normalized.length > RESPONSE_LIMITS[task.part]
    ) {
      return writingResponseInvalid();
    }
    if (task.source_version !== payload.contentVersion) {
      return writingContentVersionConflict();
    }

    const draft = await this.prisma.toeic_writing_drafts.upsert({
      where: { user_id_task_id: { user_id: userId, task_id: taskId } },
      create: {
        user_id: userId,
        task_id: taskId,
        content_version: payload.contentVersion,
        response_text: payload.responseText,
      },
      update: {
        content_version: payload.contentVersion,
        response_text: payload.responseText,
      },
      select: {
        id: true,
        task_id: true,
        content_version: true,
        response_text: true,
        updated_at: true,
      },
    });
    return mapToeicWritingDraft(draft);
  }
}
