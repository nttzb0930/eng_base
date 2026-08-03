import { Injectable, NotFoundException } from "@nestjs/common";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { writingImageNotFound } from "../toeic-writing.errors";

export type ToeicWritingImageDescriptor = {
  absolutePath: string;
  bytes: number;
  contentType: string;
  etag: string;
};

@Injectable()
export class GetToeicWritingImageUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writingContentRoot: string
  ) {}

  async execute(taskId: number): Promise<ToeicWritingImageDescriptor> {
    const task = await this.prisma.toeic_writing_tasks.findFirst({
      where: { id: taskId, part: 1, status: "PUBLISHED" },
      select: {
        image_storage_path: true,
        image_sha256: true,
        image_bytes: true,
        image_content_type: true,
      },
    });
    if (
      !task?.image_storage_path ||
      !task.image_sha256 ||
      !/^[a-f0-9]{64}$/u.test(task.image_sha256) ||
      task.image_bytes === null ||
      task.image_bytes <= 0 ||
      !task.image_content_type ||
      !/^image\/(?:jpeg|png|webp)$/u.test(task.image_content_type)
    ) {
      return writingImageNotFound();
    }

    try {
      const root = await realpath(resolve(this.writingContentRoot));
      const candidate = await realpath(resolve(root, task.image_storage_path));
      const relativePath = relative(root, candidate);
      if (
        relativePath === "" ||
        relativePath === ".." ||
        relativePath.startsWith(`..${sep}`) ||
        isAbsolute(relativePath)
      ) {
        return writingImageNotFound();
      }
      const file = await stat(candidate);
      if (!file.isFile() || file.size !== task.image_bytes) {
        return writingImageNotFound();
      }
      return {
        absolutePath: candidate,
        bytes: task.image_bytes,
        contentType: task.image_content_type,
        etag: `"${task.image_sha256}"`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return writingImageNotFound();
    }
  }
}
