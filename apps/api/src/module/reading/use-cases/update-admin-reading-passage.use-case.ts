import { Injectable } from "@nestjs/common";
import type { UpdateReadingPassagePayload } from "@repo/shared";

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
export class UpdateAdminReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: UpdateReadingPassagePayload) {
    assertValidReadingContent(body);
    return this.prisma.$transaction(async (transaction) => {
      await assertReadingTopicExists(transaction, body.topicId);
      await transaction.reading_questions.deleteMany({
        where: { passage_id: id },
      });
      return mapAdminReadingPassage(
        await transaction.reading_passages.update({
          where: { id },
          data: {
            ...toReadingPassageData(body),
            reading_questions: {
              create: toReadingQuestionCreateData(body.questions),
            },
          },
          include: readingPassageAggregateInclude,
        }),
      );
    });
  }
}
