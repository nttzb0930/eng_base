import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ToeicListeningAnswerCheckPayload,
  ToeicListeningAnswerCheckResult,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapToeicListeningVocabulary } from "../toeic-listening-vocabulary.mapper";
import { parseToeicListeningChoiceTranslation } from "./toeic-listening-translation.policy";

@Injectable()
export class CheckToeicListeningAnswerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    testId: number,
    input: ToeicListeningAnswerCheckPayload
  ): Promise<ToeicListeningAnswerCheckResult> {
    const test = await this.prisma.toeic_tests.findFirst({
      where: {
        id: testId,
        listening_status: "PUBLISHED",
        listening_source_version: input.listeningSourceVersion,
      },
      select: {
        id: true,
        listening_source_version: true,
        toeic_questions: {
          where: { id: input.questionId, part: input.practicePart },
          select: {
            id: true,
            part: true,
            prompt: true,
            translation: true,
            transcript: true,
            transcript_translation: true,
            explanation: true,
            toeic_question_vocabulary_cache: {
              select: { vocabulary: true },
            },
            toeic_stimuli: {
              select: {
                transcript: true,
                transcript_translation: true,
              },
            },
            toeic_question_options: {
              orderBy: { label: "asc" },
              select: {
                id: true,
                label: true,
                text: true,
                correct: true,
              },
            },
          },
        },
      },
    });
    const question = test?.toeic_questions[0];
    if (!question) {
      throw new NotFoundException(
        "TOEIC Listening practice question not found"
      );
    }
    const selectedOption = question.toeic_question_options.find(
      (option) => option.id === input.optionId
    );
    if (!selectedOption) {
      throw new BadRequestException(
        "Selected option does not belong to question"
      );
    }
    const correctOption = question.toeic_question_options.find(
      (option) => option.correct
    );
    if (!correctOption) {
      throw new NotFoundException("TOEIC Listening answer key not found");
    }

    const transcript =
      question.transcript ?? question.toeic_stimuli?.transcript ?? null;
    const transcriptTranslation =
      question.transcript_translation ??
      question.toeic_stimuli?.transcript_translation ??
      null;
    const parsedTranslation = parseToeicListeningChoiceTranslation(
      input.practicePart,
      question.translation ?? transcriptTranslation
    );
    return {
      questionId: question.id,
      selectedOptionId: selectedOption.id,
      correctOptionId: correctOption.id,
      correctOptionLabel: correctOption.label,
      correctOptionText: correctOption.text,
      correct: selectedOption.correct,
      questionTranslation: parsedTranslation.questionTranslation,
      answerTranslations: parsedTranslation.answerTranslations,
      transcript,
      transcriptTranslation:
        input.practicePart >= 3
          ? (question.translation ?? transcriptTranslation)
          : null,
      explanation: question.explanation,
      vocabulary: question.toeic_question_vocabulary_cache
        ? mapToeicListeningVocabulary(
            question.toeic_question_vocabulary_cache.vocabulary
          )
        : [],
    };
  }
}
