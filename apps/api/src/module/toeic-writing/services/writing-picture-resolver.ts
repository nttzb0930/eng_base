import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { WritingAiRepository } from "../repository/writing-ai.repository";
import type {
  ResolvedWritingPicture,
  WritingPartOneTask,
  WritingPictureResolver,
} from "../use-cases/grade-toeic-writing-part-one.use-case";

const IMAGE_PROMPT_VERSION = "toeic-writing-image-context-v1";

export class OwnedWritingPictureResolver implements WritingPictureResolver {
  constructor(
    private readonly repository: WritingAiRepository,
    private readonly writingContentRoot: string
  ) {}

  async resolve(task: WritingPartOneTask): Promise<ResolvedWritingPicture> {
    const context = await this.repository.findPictureContext({
      taskId: task.id,
      imageSha256: task.imageSha256,
      promptVersion: IMAGE_PROMPT_VERSION,
    });
    if (context) return { source: "ENRICHED", context: context.context };

    const root = await realpath(resolve(this.writingContentRoot));
    const image = await realpath(resolve(root, task.imageStoragePath));
    const path = relative(root, image);
    if (
      path === "" ||
      path === ".." ||
      path.startsWith(`..${sep}`) ||
      isAbsolute(path)
    ) {
      throw new Error("Writing picture is unavailable");
    }
    return {
      source: "DIRECT_IMAGE",
      imageBytes: await readFile(image),
      mimeType: task.imageMimeType,
    };
  }
}
