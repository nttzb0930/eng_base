import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ToeicListeningPart,
  ToeicListeningTestDetail,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  asToeicListeningPart,
  mediaIdsByRole,
  TOEIC_LISTENING_PARTS,
} from "../toeic-listening.mapper";

@Injectable()
export class GetToeicListeningTestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    testId: number,
    requestedPart?: ToeicListeningPart
  ): Promise<ToeicListeningTestDetail> {
    const partWhere = requestedPart
      ? { part: requestedPart }
      : { part: { in: [...TOEIC_LISTENING_PARTS] } };
    const test = await this.prisma.toeic_tests.findFirst({
      where: {
        id: testId,
        listening_status: "PUBLISHED",
        listening_source_version: { not: null },
      },
      select: {
        id: true,
        title: true,
        listening_source_version: true,
        toeic_test_sets: { select: { title: true } },
        toeic_stimuli: {
          where: partWhere,
          orderBy: [{ part: "asc" }, { id: "asc" }],
          select: {
            id: true,
            part: true,
            toeic_media_bindings: {
              orderBy: { order: "asc" },
              select: { media_asset_id: true, role: true, order: true },
            },
          },
        },
        toeic_questions: {
          where: partWhere,
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            part: true,
            stimulus_id: true,
            prompt: true,
            toeic_media_bindings: {
              orderBy: { order: "asc" },
              select: { media_asset_id: true, role: true, order: true },
            },
            toeic_question_options: {
              orderBy: { label: "asc" },
              select: { id: true, label: true, text: true },
            },
          },
        },
      },
    });
    if (!test) throw new NotFoundException("TOEIC Listening test not found");
    if (requestedPart !== undefined && test.toeic_questions.length === 0) {
      throw new NotFoundException("TOEIC Listening Part not found");
    }

    const parts = requestedPart ? [requestedPart] : TOEIC_LISTENING_PARTS;
    return {
      id: test.id,
      title: test.title,
      sourceSetName: test.toeic_test_sets.title,
      listeningSourceVersion: test.listening_source_version!,
      questionCount: test.toeic_questions.length,
      parts: parts.map((part) => {
        const questions = test.toeic_questions
          .filter((question) => question.part === part)
          .map((question) => {
            const audioIds = mediaIdsByRole(
              question.toeic_media_bindings,
              "AUDIO"
            );
            return {
              id: question.id,
              number: question.number,
              part: asToeicListeningPart(question.part),
              stimulusId: question.stimulus_id,
              prompt: part < 3 ? null : question.prompt,
              audioMediaId: audioIds[0] ?? null,
              imageMediaIds: mediaIdsByRole(
                question.toeic_media_bindings,
                "IMAGE"
              ),
              options: question.toeic_question_options.map((option) => ({
                ...option,
                text: part < 3 ? null : option.text,
              })),
            };
          });
        return {
          part,
          questionCount: questions.length,
          stimuli: test.toeic_stimuli
            .filter((stimulus) => stimulus.part === part)
            .map((stimulus) => {
              const audioIds = mediaIdsByRole(
                stimulus.toeic_media_bindings,
                "AUDIO"
              );
              return {
                id: stimulus.id,
                part: asToeicListeningPart(stimulus.part),
                audioMediaId: audioIds[0] ?? null,
                imageMediaIds: mediaIdsByRole(
                  stimulus.toeic_media_bindings,
                  "IMAGE"
                ),
              };
            }),
          questions,
        };
      }),
    };
  }
}
