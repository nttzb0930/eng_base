import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { CheckToeicListeningAnswerUseCase } from "../use-cases/check-toeic-listening-answer.use-case";

const version = "a".repeat(64);

function createQuestion() {
  return {
    id: 31,
    part: 3,
    prompt: "Where will the woman submit the revised document?",
    translation: "Please leave the revised document at reception.",
    transcript: null,
    transcript_translation: null,
    explanation: "The speaker says she will submit it at reception.",
    toeic_question_vocabulary_cache: {
      vocabulary: [
        {
          word: "revised",
          pos: "adj",
          cefr: "B1",
          ipa_us: "revised-us",
          ipa_uk: "revised-uk",
          meaning_vi: "revised meaning",
          example_en: "Please submit the revised document.",
          example_vi: "Revised example translation.",
          collocations: [
            { en: "revised document", vi: "revised document meaning" },
          ],
          synonym: { en: "updated", vi: "updated meaning" },
        },
      ],
    },
    toeic_stimuli: {
      transcript: "Please leave the revised document at reception.",
      transcript_translation: "Please leave the revised document at reception.",
    },
    toeic_question_options: [
      { id: 41, label: "A", text: "At reception", correct: true },
      { id: 42, label: "B", text: "By email", correct: false },
    ],
  };
}

test("Part practice grades one answer and returns question-owned vocabulary", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findFirst: (args: unknown) => {
        query = args;
        return Promise.resolve({
          id: 11,
          listening_source_version: version,
          toeic_questions: [createQuestion()],
        });
      },
    },
  } as unknown as PrismaService;

  const result = await new CheckToeicListeningAnswerUseCase(prisma).execute(
    11,
    {
      listeningSourceVersion: version,
      practicePart: 3,
      questionId: 31,
      optionId: 42,
    }
  );

  assert.equal(result.correct, false);
  assert.equal(result.selectedOptionId, 42);
  assert.equal(result.correctOptionId, 41);
  assert.equal(result.correctOptionLabel, "A");
  assert.deepEqual(result.answerTranslations, []);
  assert.equal(result.questionTranslation, null);
  assert.equal(
    result.transcript,
    "Please leave the revised document at reception."
  );
  assert.equal(
    result.transcriptTranslation,
    "Please leave the revised document at reception."
  );
  assert.equal(result.vocabulary[0]?.word, "revised");
  assert.equal(result.vocabulary[0]?.cefrLevel, "B1");
  assert.equal(result.vocabulary[0]?.ipaUs, "revised-us");
  assert.equal(result.vocabulary[0]?.collocations[0]?.en, "revised document");
  assert.deepEqual((query as { where: unknown }).where, {
    id: 11,
    listening_status: "PUBLISHED",
    listening_source_version: version,
  });
});

test("answer checking returns empty vocabulary when the question has no cache", async () => {
  const question = createQuestion();
  question.toeic_question_vocabulary_cache = null as never;
  const prisma = {
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          id: 11,
          listening_source_version: version,
          toeic_questions: [question],
        }),
    },
  } as unknown as PrismaService;

  const result = await new CheckToeicListeningAnswerUseCase(prisma).execute(
    11,
    {
      listeningSourceVersion: version,
      practicePart: 3,
      questionId: 31,
      optionId: 42,
    }
  );

  assert.deepEqual(result.vocabulary, []);
});

test("answer checking is unavailable without an explicit matching Part", async () => {
  const prisma = {
    toeic_tests: {
      findFirst: () => Promise.resolve(null),
    },
  } as unknown as PrismaService;
  const useCase = new CheckToeicListeningAnswerUseCase(prisma);

  await assert.rejects(
    () =>
      useCase.execute(11, {
        listeningSourceVersion: version,
        practicePart: 2,
        questionId: 31,
        optionId: 42,
      }),
    NotFoundException
  );
});

test("answer checking rejects an option outside the requested question", async () => {
  const prisma = {
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          id: 11,
          listening_source_version: version,
          toeic_questions: [createQuestion()],
        }),
    },
  } as unknown as PrismaService;
  const useCase = new CheckToeicListeningAnswerUseCase(prisma);

  await assert.rejects(
    () =>
      useCase.execute(11, {
        listeningSourceVersion: version,
        practicePart: 3,
        questionId: 31,
        optionId: 999,
      }),
    BadRequestException
  );
});
