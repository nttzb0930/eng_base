import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
} from "../mappers/reading.mapper";

@Injectable()
export class ListAdminReadingPassagesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return (
      await this.prisma.reading_passages.findMany({
        include: readingPassageAggregateInclude,
        orderBy: { created_at: "desc" },
      })
    ).map(mapAdminReadingPassage);
  }
}
