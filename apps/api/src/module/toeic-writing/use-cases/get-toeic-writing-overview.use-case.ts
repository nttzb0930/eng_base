import { Injectable } from "@nestjs/common";
import type { ToeicWritingOverview, ToeicWritingPart } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class GetToeicWritingOverviewUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<ToeicWritingOverview> {
    const [tasks, submissions] = await Promise.all([
      this.prisma.toeic_writing_tasks.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, part: true },
      }),
      this.prisma.toeic_writing_submissions.findMany({
        where: { user_id: userId, task: { status: "PUBLISHED" } },
        distinct: ["task_id"],
        select: { task_id: true },
      }),
    ]);
    const submittedTaskIds = new Set(
      submissions.map((submission) => submission.task_id)
    );
    const parts = ([1, 2] as const).map((part: ToeicWritingPart) => {
      const partTasks = tasks.filter((task) => task.part === part);
      return {
        part,
        publishedTaskCount: partTasks.length,
        submittedTaskCount: partTasks.filter((task) =>
          submittedTaskIds.has(task.id)
        ).length,
      };
    });

    return {
      publishedTaskCount: tasks.length,
      submittedTaskCount: tasks.filter((task) => submittedTaskIds.has(task.id))
        .length,
      parts,
    };
  }
}
