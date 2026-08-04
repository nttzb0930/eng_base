import type { Prisma, PrismaClient } from "@prisma/client";

import type { ToeicListeningImportStore } from "./toeic-listening-practice.import.js";
import type { ToeicListeningPracticeTest } from "./toeic-listening-practice.types.js";

async function replaceListeningContent(input: {
  transaction: Prisma.TransactionClient;
  testId: number;
  content: ToeicListeningPracticeTest;
}) {
  const { transaction, testId, content } = input;
  const parts = [1, 2, 3, 4];
  const [questions, stimuli] = await Promise.all([
    transaction.toeic_questions.findMany({
      where: { test_id: testId, part: { in: parts } },
      select: { id: true },
    }),
    transaction.toeic_stimuli.findMany({
      where: { test_id: testId, part: { in: parts } },
      select: { id: true },
    }),
  ]);
  const bindings = await transaction.toeic_media_bindings.findMany({
    where: {
      OR: [
        { question_id: { in: questions.map((item) => item.id) } },
        { stimulus_id: { in: stimuli.map((item) => item.id) } },
      ],
    },
    select: { media_asset_id: true },
  });
  await transaction.toeic_questions.deleteMany({
    where: { test_id: testId, part: { in: parts } },
  });
  await transaction.toeic_stimuli.deleteMany({
    where: { test_id: testId, part: { in: parts } },
  });
  if (bindings.length > 0) {
    await transaction.toeic_media_assets.deleteMany({
      where: {
        id: { in: [...new Set(bindings.map((item) => item.media_asset_id))] },
      },
    });
  }

  const mediaIds = new Map<string, number>();
  for (const media of content.media) {
    const asset = await transaction.toeic_media_assets.upsert({
      where: {
        test_id_source_media_id: {
          test_id: testId,
          source_media_id: media.id,
        },
      },
      create: {
        test_id: testId,
        source_media_id: media.id,
        source_url: media.sourceUrl,
        storage_path: media.storagePath,
        sha256: media.sha256,
        bytes: media.bytes,
        content_type: media.contentType,
        status: "DOWNLOADED",
      },
      update: {
        source_url: media.sourceUrl,
        storage_path: media.storagePath,
        sha256: media.sha256,
        bytes: media.bytes,
        content_type: media.contentType,
        status: "DOWNLOADED",
      },
      select: { id: true },
    });
    mediaIds.set(media.id, asset.id);
  }

  const stimulusIds = new Map<string, number>();
  for (const part of content.parts) {
    for (const stimulus of part.stimuli) {
      const created = await transaction.toeic_stimuli.create({
        data: {
          test_id: testId,
          source_stimulus_id: stimulus.sourceStimulusId,
          part: part.part,
          kind: "audio",
          body: null,
          translation: null,
          transcript: stimulus.transcript,
          transcript_translation: stimulus.translation,
        },
        select: { id: true },
      });
      stimulusIds.set(stimulus.sourceStimulusId, created.id);
      await transaction.toeic_media_bindings.createMany({
        data: [
          {
            media_asset_id: mediaIds.get(stimulus.audioMediaId)!,
            stimulus_id: created.id,
            role: "AUDIO",
            order: 0,
          },
          ...stimulus.imageMediaIds.map((mediaId, order) => ({
            media_asset_id: mediaIds.get(mediaId)!,
            stimulus_id: created.id,
            role: "IMAGE",
            order,
          })),
        ],
      });
    }
  }

  for (const part of content.parts) {
    for (const question of part.questions) {
      const created = await transaction.toeic_questions.create({
        data: {
          test_id: testId,
          stimulus_id: question.stimulusId
            ? stimulusIds.get(question.stimulusId)
            : null,
          source_question_id: question.sourceQuestionId,
          number: question.sourceNumber,
          part: part.part,
          prompt: question.prompt ?? "",
          translation: question.translation,
          explanation: question.explanation,
          transcript: question.transcript,
          transcript_translation: question.translation,
          toeic_question_options: {
            create: question.choices.map((choice) => ({
              label: choice.label,
              text: choice.text ?? "",
              correct: choice.correct,
            })),
          },
        },
        select: { id: true },
      });
      const bindingData = [
        ...(question.audioMediaId
          ? [
              {
                media_asset_id: mediaIds.get(question.audioMediaId)!,
                question_id: created.id,
                role: "AUDIO",
                order: 0,
              },
            ]
          : []),
        ...question.imageMediaIds.map((mediaId, order) => ({
          media_asset_id: mediaIds.get(mediaId)!,
          question_id: created.id,
          role: "IMAGE",
          order,
        })),
      ];
      if (bindingData.length > 0) {
        await transaction.toeic_media_bindings.createMany({
          data: bindingData,
        });
      }
    }
  }
}

export function createPrismaToeicListeningImportStore(
  prisma: PrismaClient,
  now: () => Date = () => new Date()
): ToeicListeningImportStore {
  return {
    async importOne(content) {
      const existing = await prisma.toeic_tests.findUnique({
        where: {
          source_source_test_id: {
            source: content.source,
            source_test_id: content.sourceTestId,
          },
        },
        select: {
          id: true,
          listening_source_version: true,
          toeic_test_sets: { select: { source_set_id: true } },
        },
      });
      if (!existing) {
        throw new Error(
          "Matching TOEIC Reading test must exist before Listening import"
        );
      }
      if (existing.toeic_test_sets.source_set_id !== content.sourceSetId) {
        throw new Error(
          "Listening source set does not match existing Reading test"
        );
      }
      if (
        existing.listening_source_version === content.listeningSourceVersion
      ) {
        return "SKIPPED";
      }
      await prisma.$transaction(
        async (transaction) => {
          await replaceListeningContent({
            transaction,
            testId: existing.id,
            content,
          });
          await transaction.toeic_tests.update({
            where: { id: existing.id },
            data: {
              listening_source_version: content.listeningSourceVersion,
              listening_status: "PUBLISHED",
              listening_published_at: now(),
            },
          });
        },
        { maxWait: 10_000, timeout: 120_000 }
      );
      return "UPDATED";
    },
  };
}
