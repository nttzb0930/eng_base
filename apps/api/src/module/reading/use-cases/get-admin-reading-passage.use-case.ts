import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
} from "../mappers/reading.mapper";
import { readingPassageNotFound } from "./reading-admin.support";

@Injectable()
export class GetAdminReadingPassageUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const passage = await this.prisma.reading_passages.findUnique({
      where: { id },
      include: readingPassageAggregateInclude,
    });
    if (!passage) throw readingPassageNotFound(id);
    return mapAdminReadingPassage(passage);
  }
}
