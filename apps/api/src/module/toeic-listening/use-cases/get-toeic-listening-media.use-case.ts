import { Injectable, NotFoundException } from "@nestjs/common";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { PrismaService } from "../../../database/prisma/prisma.service";

export type LocalMediaDescriptor = {
  absolutePath: string;
  bytes: number;
  contentType: string;
  etag: string;
};

const LISTENING_PARTS = [1, 2, 3, 4] as const;

function mediaNotFound(): never {
  throw new NotFoundException("TOEIC Listening media not found");
}

@Injectable()
export class GetToeicListeningMediaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licensedContentRoot: string
  ) {}

  async execute(assetId: number): Promise<LocalMediaDescriptor> {
    const asset = await this.prisma.toeic_media_assets.findFirst({
      where: {
        id: assetId,
        status: "DOWNLOADED",
        toeic_tests: { listening_status: "PUBLISHED" },
        toeic_media_bindings: {
          some: {
            OR: [
              {
                toeic_questions: { part: { in: [...LISTENING_PARTS] } },
              },
              {
                toeic_stimuli: { part: { in: [...LISTENING_PARTS] } },
              },
            ],
          },
        },
      },
      select: {
        id: true,
        status: true,
        storage_path: true,
        bytes: true,
        content_type: true,
        sha256: true,
      },
    });
    if (
      !asset ||
      asset.status !== "DOWNLOADED" ||
      !asset.storage_path ||
      asset.bytes === null ||
      asset.bytes <= 0 ||
      !asset.content_type ||
      !asset.sha256 ||
      !/^[a-f0-9]{64}$/u.test(asset.sha256)
    ) {
      return mediaNotFound();
    }

    try {
      const root = await realpath(resolve(this.licensedContentRoot));
      const candidate = await realpath(resolve(root, asset.storage_path));
      const relativePath = relative(root, candidate);
      if (
        relativePath === "" ||
        relativePath.startsWith("..") ||
        isAbsolute(relativePath)
      ) {
        return mediaNotFound();
      }
      const file = await stat(candidate);
      if (!file.isFile() || file.size !== asset.bytes) return mediaNotFound();
      return {
        absolutePath: candidate,
        bytes: asset.bytes,
        contentType: asset.content_type,
        etag: `"${asset.sha256}"`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return mediaNotFound();
    }
  }
}
