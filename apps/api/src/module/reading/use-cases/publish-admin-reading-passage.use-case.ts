import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
  toReadingContentInput,
} from "../mappers/reading.mapper";
import {
  assertValidReadingContent,
  readingPassageNotFound,
} from "./reading-admin.support";

@Injectable()
export class PublishAdminReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const passage = await this.prisma.reading_passages.findUnique({
      where: { id },
      include: readingPassageAggregateInclude,
    });
    if (!passage) throw readingPassageNotFound(id);
    assertValidReadingContent(toReadingContentInput(passage));

    return mapAdminReadingPassage(
      await this.prisma.reading_passages.update({
        where: { id },
        data: { status: "PUBLISHED", published_at: new Date() },
        include: readingPassageAggregateInclude,
      }),
    );
  }
}
