import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapAdminReadingPassage,
  readingPassageAggregateInclude,
  toReadingPassageData,
  toReadingQuestionCreateData,
} from "../mappers/reading.mapper";
import {
  mapReadingSourceCandidateDetail,
  mapReadingSourceCandidateSummary,
} from "../mappers/reading-source-candidate.mapper";
import {
  ReadingSourceCandidateRepository,
  type ReadingSourceCandidateQuery,
} from "./reading-source-candidate.repository";

@Injectable()
export class PrismaReadingSourceCandidateRepository
  extends ReadingSourceCandidateRepository
{
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(query: ReadingSourceCandidateQuery) {
    const where: Prisma.reading_source_candidatesWhereInput = {
      status: query.status,
      source_level: query.sourceLevel,
      ...(query.search
        ? {
            OR: [
              { source_title: { contains: query.search, mode: "insensitive" } },
              { source_id: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.reading_source_candidates.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.reading_source_candidates.count({ where }),
    ]);
    return {
      items: records.map(mapReadingSourceCandidateSummary),
      total,
    };
  }

  async findDetail(id: number) {
    const record = await this.prisma.reading_source_candidates.findUnique({
      where: { id },
    });
    return record ? mapReadingSourceCandidateDetail(record) : null;
  }

  async topicExists(topicId: number) {
    return Boolean(
      await this.prisma.vocabulary_topics.findUnique({
        where: { id: topicId },
        select: { id: true },
      }),
    );
  }

  async convertToDraft(input: {
    candidateId: number;
    payload: Parameters<ReadingSourceCandidateRepository["convertToDraft"]>[0]["payload"];
  }) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const passage = await transaction.reading_passages.create({
        data: {
          slug: input.payload.slug.trim(),
          ...toReadingPassageData(input.payload),
          status: "DRAFT",
          reading_questions: {
            create: toReadingQuestionCreateData(input.payload.questions),
          },
        },
        include: readingPassageAggregateInclude,
      });
      const claimed = await transaction.reading_source_candidates.updateMany({
        where: { id: input.candidateId, status: "PENDING" },
        data: { status: "CONVERTED", converted_passage_id: passage.id },
      });
      if (claimed.count !== 1) {
        throw new ConflictException("Reading candidate is no longer pending");
      }
      const candidate =
        await transaction.reading_source_candidates.findUniqueOrThrow({
          where: { id: input.candidateId },
        });
      return { candidate, passage };
    });
    return {
      candidate: mapReadingSourceCandidateDetail(result.candidate),
      passage: mapAdminReadingPassage(result.passage),
    };
  }

  async reject(input: { candidateId: number; reason: string }) {
    const result = await this.prisma.reading_source_candidates.updateMany({
      where: { id: input.candidateId, status: "PENDING" },
      data: { status: "REJECTED", rejection_reason: input.reason },
    });
    if (result.count !== 1) {
      throw new ConflictException("Reading candidate is no longer pending");
    }
    return mapReadingSourceCandidateDetail(
      await this.prisma.reading_source_candidates.findUniqueOrThrow({
        where: { id: input.candidateId },
      }),
    );
  }
}
