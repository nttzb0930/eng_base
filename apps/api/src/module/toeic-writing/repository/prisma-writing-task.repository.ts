import { z } from "zod";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { writingTaskNotFound } from "../toeic-writing.errors";
import type {
  WritingPartOneTask,
  WritingPartOneTaskSource,
} from "../use-cases/grade-toeic-writing-part-one.use-case";
import type {
  WritingPartTwoTask,
  WritingPartTwoTaskSource,
} from "../use-cases/grade-toeic-writing-part-two.use-case";

const payloadSchema = z.object({
  requiredWords: z.array(z.object({ en: z.string().trim().min(1) })).min(2),
});

const partTwoPayloadSchema = z.object({
  promptEn: z.string().trim().min(1),
  requirements: z
    .array(
      z.object({
        order: z.number().int().positive(),
        textEn: z.string().trim().min(1),
        textVi: z.string().trim().min(1).nullable(),
      })
    )
    .min(1),
});

export class PrismaWritingPartOneTaskSource implements WritingPartOneTaskSource {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedPartOne(taskId: number): Promise<WritingPartOneTask> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, part: 1, status: "PUBLISHED" },
      select: {
        id: true,
        source_version: true,
        payload: true,
        image_sha256: true,
        image_storage_path: true,
        image_content_type: true,
      },
    });
    if (
      !task?.image_sha256 ||
      !task.image_storage_path ||
      !task.image_content_type ||
      !/^image\/(?:jpeg|png|webp)$/u.test(task.image_content_type)
    ) {
      return writingTaskNotFound();
    }
    const payload = payloadSchema.parse(task.payload);
    return {
      id: task.id,
      contentVersion: task.source_version,
      requiredWords: payload.requiredWords.map(({ en }) => en),
      imageSha256: task.image_sha256,
      imageStoragePath: task.image_storage_path,
      imageMimeType:
        task.image_content_type as WritingPartOneTask["imageMimeType"],
    };
  }
}

export class PrismaWritingPartTwoTaskSource implements WritingPartTwoTaskSource {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedPartTwo(taskId: number): Promise<WritingPartTwoTask> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, part: 2, status: "PUBLISHED" },
      select: { id: true, source_version: true, payload: true },
    });
    if (!task) return writingTaskNotFound();
    const payload = partTwoPayloadSchema.parse(task.payload);
    return {
      id: task.id,
      contentVersion: task.source_version,
      sourceEmail: payload.promptEn,
      requirements: [...payload.requirements]
        .sort((left, right) => left.order - right.order)
        .map((requirement) => ({
          id: `requirement-${requirement.order}`,
          textEn: requirement.textEn,
          textVi: requirement.textVi,
        })),
    };
  }
}
