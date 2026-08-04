import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { ToeicWritingCommunityPage } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";

function authorLabel(userId: string): string {
  const identity = createHash("sha256")
    .update(userId, "utf8")
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `Learner ${identity}`;
}

@Injectable()
export class ListToeicWritingCommunityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    taskId: number,
    cursor: number | undefined,
    limit: number
  ): Promise<ToeicWritingCommunityPage> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, part: 2, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!task) return writingTaskNotFound();

    const rows = await this.prisma.toeic_writing_submissions.findMany({
      where: {
        task_id: taskId,
        shared_at: { not: null },
        share_revoked_at: null,
        ...(cursor === undefined ? {} : { id: { lt: cursor } }),
      },
      orderBy: [{ shared_at: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        user_id: true,
        response_text: true,
        shared_at: true,
      },
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((row) => ({
      submissionId: row.id,
      responseText: row.response_text,
      authorLabel: authorLabel(row.user_id),
      sharedAt: row.shared_at!.toISOString(),
    }));
    return {
      items,
      nextCursor: hasMore ? (items.at(-1)?.submissionId ?? null) : null,
    };
  }
}
