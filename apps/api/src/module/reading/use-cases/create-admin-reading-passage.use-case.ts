import { Injectable } from "@nestjs/common";
import type { CreateReadingPassagePayload } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
  toReadingPassageData,
  toReadingQuestionCreateData,
} from "../mappers/reading.mapper";
import {
  assertReadingTopicExists,
  assertValidReadingContent,
} from "./reading-admin.support";

@Injectable()
export class CreateAdminReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: CreateReadingPassagePayload) {
    assertValidReadingContent(body);
    await assertReadingTopicExists(this.prisma, body.topicId);
    return mapAdminReadingPassage(
      await this.prisma.reading_passages.create({
        data: {
          slug: body.slug.trim(),
          ...toReadingPassageData(body),
          reading_questions: {
            create: toReadingQuestionCreateData(body.questions),
          },
        },
        include: readingPassageAggregateInclude,
      }),
    );
  }
}
