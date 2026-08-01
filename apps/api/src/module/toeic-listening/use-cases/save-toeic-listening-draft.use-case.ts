import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ToeicListeningDraft,
  ToeicListeningDraftPayload,
} from "@repo/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicListeningDraft,
  toeicListeningDraftScope,
} from "../toeic-listening-draft.mapper";
const TTL = 30 * 24 * 60 * 60 * 1000;
@Injectable()
export class SaveToeicListeningDraftUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(
    userId: string,
    testId: number,
    payload: ToeicListeningDraftPayload
  ): Promise<ToeicListeningDraft> {
    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: testId, listening_status: "PUBLISHED" },
      select: {
        id: true,
        listening_source_version: true,
        toeic_questions: {
          where:
            payload.practicePart === undefined
              ? { part: { in: [1, 2, 3, 4] } }
              : { part: payload.practicePart },
          select: {
            id: true,
            toeic_question_options: { select: { id: true } },
            toeic_media_bindings: { select: { media_asset_id: true } },
          },
        },
        toeic_stimuli: {
          where:
            payload.practicePart === undefined
              ? { part: { in: [1, 2, 3, 4] } }
              : { part: payload.practicePart },
          select: {
            toeic_media_bindings: { select: { media_asset_id: true } },
          },
        },
      },
    });
    if (!test?.listening_source_version)
      throw new NotFoundException("TOEIC Listening test not found");
    if (test.listening_source_version !== payload.listeningSourceVersion)
      throw new ConflictException(
        "TOEIC Listening test changed; reload before saving"
      );
    if (test.toeic_questions.length === 0)
      throw new NotFoundException("TOEIC Listening Part not found");
    this.validate(test, payload);
    const scope = toeicListeningDraftScope(payload.practicePart);
    const data = {
      listening_source_version: payload.listeningSourceVersion,
      active_question_id: payload.activeQuestionId,
      answers: payload.answers as Prisma.InputJsonValue,
      review_question_ids: payload.reviewQuestionIds,
      completed_media_ids: payload.completedMediaIds,
      active_media_id: payload.activeMediaId,
      playback_position_ms: payload.playbackPositionMs,
      expires_at: new Date(Date.now() + TTL),
    };
    const saved = await this.prisma.toeic_listening_drafts.upsert({
      where: {
        user_id_test_id_scope: { user_id: userId, test_id: testId, scope },
      },
      create: { user_id: userId, test_id: testId, scope, ...data },
      update: data,
    });
    return mapToeicListeningDraft(saved);
  }
  private validate(
    test: {
      toeic_questions: Array<{
        id: number;
        toeic_question_options: Array<{ id: number }>;
        toeic_media_bindings: Array<{ media_asset_id: number }>;
      }>;
      toeic_stimuli: Array<{
        toeic_media_bindings: Array<{ media_asset_id: number }>;
      }>;
    },
    payload: ToeicListeningDraftPayload
  ) {
    const options = new Map(
      test.toeic_questions.map((q) => [
        q.id,
        new Set(q.toeic_question_options.map((o) => o.id)),
      ])
    );
    if (!options.has(payload.activeQuestionId))
      throw new BadRequestException(
        "Active question does not belong to this TOEIC Listening scope"
      );
    const answerIds = new Set<number>();
    for (const answer of payload.answers) {
      if (answerIds.has(answer.questionId))
        throw new BadRequestException("Draft contains duplicate answers");
      answerIds.add(answer.questionId);
      if (!options.get(answer.questionId)?.has(answer.optionId))
        throw new BadRequestException(
          "Draft answer does not belong to this TOEIC Listening scope"
        );
    }
    const reviews = new Set<number>();
    for (const id of payload.reviewQuestionIds) {
      if (reviews.has(id) || !options.has(id))
        throw new BadRequestException(
          "Invalid review question in Listening draft"
        );
      reviews.add(id);
    }
    const media = new Set([
      ...test.toeic_questions.flatMap((q) =>
        q.toeic_media_bindings.map((b) => b.media_asset_id)
      ),
      ...test.toeic_stimuli.flatMap((s) =>
        s.toeic_media_bindings.map((b) => b.media_asset_id)
      ),
    ]);
    const completed = new Set<number>();
    for (const id of payload.completedMediaIds) {
      if (completed.has(id) || !media.has(id))
        throw new BadRequestException(
          "Invalid completed media in Listening draft"
        );
      completed.add(id);
    }
    if (payload.activeMediaId !== null && !media.has(payload.activeMediaId))
      throw new BadRequestException("Invalid active media in Listening draft");
    if (
      !Number.isInteger(payload.playbackPositionMs) ||
      payload.playbackPositionMs < 0
    )
      throw new BadRequestException(
        "Invalid playback position in Listening draft"
      );
  }
}
