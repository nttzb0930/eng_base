import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicReadingPart, ToeicReadingTestDetail } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  asToeicReadingPart,
  TOEIC_READING_PARTS,
} from "../toeic-reading.mapper";

@Injectable()
export class GetToeicReadingTestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    testId: number,
    requestedPart?: ToeicReadingPart
  ): Promise<ToeicReadingTestDetail> {
    const test = await this.prisma.toeic_tests.findFirst({
      where: { id: testId, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        source_version: true,
        toeic_test_sets: { select: { title: true } },
        toeic_stimuli: {
          where: requestedPart ? { part: requestedPart } : undefined,
          orderBy: [{ part: "asc" }, { id: "asc" }],
          select: {
            id: true,
            part: true,
            kind: true,
            body: true,
            translation: true,
          },
        },
        toeic_questions: {
          where: requestedPart ? { part: requestedPart } : undefined,
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            part: true,
            stimulus_id: true,
            prompt: true,
            translation: true,
            toeic_question_options: {
              orderBy: { label: "asc" },
              select: {
                id: true,
                label: true,
                text: true,
              },
            },
          },
        },
      },
    });
    if (!test) throw new NotFoundException("TOEIC Reading test not found");
    const questions = test.toeic_questions.filter(
      (question) =>
        requestedPart === undefined || question.part === requestedPart
    );
    if (requestedPart !== undefined && questions.length === 0) {
      throw new NotFoundException("TOEIC Reading Part not found");
    }
    const parts = requestedPart ? [requestedPart] : TOEIC_READING_PARTS;

    return {
      id: test.id,
      title: test.title,
      sourceSetName: test.toeic_test_sets.title,
      sourceVersion: test.source_version,
      questionCount: questions.length,
      parts: parts.map((part) => {
        const partQuestions = questions
          .filter((question) => question.part === part)
          .map((question) => ({
            id: question.id,
            number: question.number,
            part: asToeicReadingPart(question.part),
            stimulusId: question.stimulus_id,
            prompt: question.prompt,
            translation: question.translation,
            options: question.toeic_question_options,
          }));
        return {
          part,
          questionCount: partQuestions.length,
          stimuli: test.toeic_stimuli
            .filter(
              (stimulus) =>
                stimulus.part === part &&
                (requestedPart === undefined || stimulus.part === requestedPart)
            )
            .map((stimulus) => ({
              id: stimulus.id,
              part: asToeicReadingPart(stimulus.part),
              kind: stimulus.kind,
              body: stimulus.body,
              translation: stimulus.translation,
            })),
          questions: partQuestions,
        };
      }),
    };
  }
}
