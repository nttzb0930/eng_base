import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ToeicReadingDraft, ToeicReadingDraftPayload } from "@repo/shared";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicReadingDraft,
  toeicReadingDraftScope,
} from "../toeic-reading-draft.mapper";

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SaveToeicReadingDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    testId: number,
    payload: ToeicReadingDraftPayload
  ): Promise<ToeicReadingDraft> {
    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: testId, status: "PUBLISHED" },
      select: {
        id: true,
        source_version: true,
        toeic_questions: {
          where:
            payload.practicePart === undefined
              ? undefined
              : { part: payload.practicePart },
          select: {
            id: true,
            part: true,
            toeic_question_options: { select: { id: true } },
          },
        },
      },
    });
    if (!test) throw new NotFoundException("TOEIC Reading test not found");
    if (test.source_version !== payload.sourceVersion) {
      throw new ConflictException(
        "TOEIC Reading test changed; reload before saving"
      );
    }
    if (test.toeic_questions.length === 0) {
      throw new NotFoundException("TOEIC Reading Part not found");
    }

    this.validatePayload(test.toeic_questions, payload);

    const scope = toeicReadingDraftScope(payload.practicePart);
    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);
    const persisted = await this.prisma.toeic_reading_drafts.upsert({
      where: {
        user_id_test_id_scope: {
          user_id: userId,
          test_id: testId,
          scope,
        },
      },
      create: {
        user_id: userId,
        test_id: testId,
        scope,
        source_version: payload.sourceVersion,
        active_question_id: payload.activeQuestionId,
        answers: payload.answers as Prisma.InputJsonValue,
        review_question_ids: payload.reviewQuestionIds,
        expires_at: expiresAt,
      },
      update: {
        source_version: payload.sourceVersion,
        active_question_id: payload.activeQuestionId,
        answers: payload.answers as Prisma.InputJsonValue,
        review_question_ids: payload.reviewQuestionIds,
        expires_at: expiresAt,
      },
    });

    return mapToeicReadingDraft(persisted);
  }

  private validatePayload(
    questions: Array<{
      id: number;
      toeic_question_options: Array<{ id: number }>;
    }>,
    payload: ToeicReadingDraftPayload
  ) {
    const optionsByQuestion = new Map(
      questions.map((question) => [
        question.id,
        new Set(question.toeic_question_options.map((option) => option.id)),
      ])
    );
    if (!optionsByQuestion.has(payload.activeQuestionId)) {
      throw new BadRequestException(
        "Active question does not belong to this TOEIC Reading scope"
      );
    }

    const answerQuestionIds = new Set<number>();
    for (const answer of payload.answers) {
      if (answerQuestionIds.has(answer.questionId)) {
        throw new BadRequestException("Draft contains duplicate answers");
      }
      answerQuestionIds.add(answer.questionId);
      if (!optionsByQuestion.get(answer.questionId)?.has(answer.optionId)) {
        throw new BadRequestException(
          "Draft answer does not belong to this TOEIC Reading scope"
        );
      }
    }

    const reviewQuestionIds = new Set<number>();
    for (const questionId of payload.reviewQuestionIds) {
      if (reviewQuestionIds.has(questionId)) {
        throw new BadRequestException(
          "Draft contains duplicate review questions"
        );
      }
      reviewQuestionIds.add(questionId);
      if (!optionsByQuestion.has(questionId)) {
        throw new BadRequestException(
          "Review question does not belong to this TOEIC Reading scope"
        );
      }
    }
  }
}
