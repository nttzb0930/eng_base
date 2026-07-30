import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  CreateReadingPassagePayload,
  UpdateReadingPassagePayload,
} from "@repo/shared";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { validateReadingContent } from "./reading-content.policy";

export function assertValidReadingContent(
  input: CreateReadingPassagePayload | UpdateReadingPassagePayload,
) {
  const issues = validateReadingContent(input);
  if (issues.length > 0) {
    throw new BadRequestException(issues);
  }
}

export async function assertReadingTopicExists(
  prisma: Pick<PrismaService, "vocabulary_topics">,
  topicId: number | null,
) {
  if (topicId === null) return;
  const topic = await prisma.vocabulary_topics.findUnique({
    where: { id: topicId },
    select: { id: true },
  });
  if (!topic) throw new NotFoundException(`Topic with ID ${topicId} not found`);
}

export function readingPassageNotFound(id: number) {
  return new NotFoundException(`Reading passage with ID ${id} not found`);
}
