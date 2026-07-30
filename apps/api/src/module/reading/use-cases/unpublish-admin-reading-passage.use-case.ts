import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
} from "../mappers/reading.mapper";

@Injectable()
export class UnpublishAdminReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapAdminReadingPassage(
      await this.prisma.reading_passages.update({
        where: { id },
        data: { status: "DRAFT", published_at: null },
        include: readingPassageAggregateInclude,
      }),
    );
  }
}
