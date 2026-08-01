import { Injectable, NotFoundException } from "@nestjs/common";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { PrismaService } from "../../../database/prisma/prisma.service";

export type ToeicDictationLocalMediaDescriptor = {
  absolutePath: string;
  bytes: number;
  contentType: string;
  etag: string;
};

@Injectable()
export class GetToeicDictationMediaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licensedContentRoot: string,
  ) {}

  async execute(itemId: number): Promise<ToeicDictationLocalMediaDescriptor> {
    const item = await this.prisma.toeic_dictation_items.findFirst({
      where: {
        id: itemId,
        is_active: true,
        toeic_dictation_sets: {
          collection_name: "Đề 2026",
          status: "PUBLISHED",
        },
      },
      select: {
        audio_storage_path: true,
        audio_bytes: true,
        audio_content_type: true,
        audio_sha256: true,
      },
    });
    if (!item || item.audio_bytes <= 0 || !/^audio\//u.test(item.audio_content_type)) {
      throw new NotFoundException("TOEIC Dictation media not found");
    }

    try {
      const root = await realpath(resolve(this.licensedContentRoot));
      const candidate = await realpath(resolve(root, item.audio_storage_path));
      const relativePath = relative(root, candidate);
      if (
        relativePath === "" ||
        relativePath.startsWith("..") ||
        isAbsolute(relativePath)
      ) {
        throw new NotFoundException("TOEIC Dictation media not found");
      }
      const file = await stat(candidate);
      if (!file.isFile() || file.size !== item.audio_bytes) {
        throw new NotFoundException("TOEIC Dictation media not found");
      }
      return {
        absolutePath: candidate,
        bytes: item.audio_bytes,
        contentType: item.audio_content_type,
        etag: `"${item.audio_sha256}"`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException("TOEIC Dictation media not found");
    }
  }
}
