import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  ToeicDictationImportSet,
  ToeicDictationImportStore,
} from "./toeic-dictation.import.js";

const ORDER_OFFSET = 1_000_000;

async function replaceSetContent(
  transaction: Prisma.TransactionClient,
  input: ToeicDictationImportSet,
  setId: number,
) {
  await transaction.toeic_dictation_items.updateMany({
    where: { set_id: setId },
    data: {
      order_index: { increment: ORDER_OFFSET },
      is_active: false,
    },
  });

  for (const item of input.set.items) {
    if (!item.audioUrl) {
      throw new Error(`Dictation item ${item.sourceItemId} has no audio URL`);
    }
    const media = input.mediaByUrl[item.audioUrl];
    if (!media) {
      throw new Error(`Dictation item ${item.sourceItemId} has no local media`);
    }
    await transaction.toeic_dictation_items.upsert({
      where: {
        set_id_source_item_id: {
          set_id: setId,
          source_item_id: item.sourceItemId,
        },
      },
      create: {
        set_id: setId,
        source_item_id: item.sourceItemId,
        source_version: input.sourceVersion,
        order_index: item.order,
        source_group: item.groupId,
        transcript: item.transcript!.trim(),
        translation_vi: item.translationVi,
        audio_asset_id: media.sha256,
        audio_storage_path: media.storagePath,
        audio_sha256: media.sha256,
        audio_bytes: media.bytes,
        audio_content_type: media.contentType,
        audio_duration_ms: item.durationSeconds
          ? Math.round(item.durationSeconds * 1000)
          : null,
        validation_status: "VALID",
        is_active: true,
      },
      update: {
        source_version: input.sourceVersion,
        order_index: item.order,
        source_group: item.groupId,
        transcript: item.transcript!.trim(),
        translation_vi: item.translationVi,
        audio_asset_id: media.sha256,
        audio_storage_path: media.storagePath,
        audio_sha256: media.sha256,
        audio_bytes: media.bytes,
        audio_content_type: media.contentType,
        audio_duration_ms: item.durationSeconds
          ? Math.round(item.durationSeconds * 1000)
          : null,
        validation_status: "VALID",
        is_active: true,
      },
    });
  }
}

export function createPrismaToeicDictationImportStore(
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
): ToeicDictationImportStore {
  return {
    async importSet(input) {
      const existing = await prisma.toeic_dictation_sets.findUnique({
        where: {
          source_source_set_id: {
            source: "dautoeic",
            source_set_id: input.set.sourceSetId,
          },
        },
        select: { id: true, source_version: true, status: true },
      });

      if (
        existing?.source_version === input.sourceVersion &&
        existing.status === "PUBLISHED"
      ) {
        return "SKIPPED";
      }

      await prisma.$transaction(async (transaction) => {
        const set = existing
          ? await transaction.toeic_dictation_sets.update({
              where: { id: existing.id },
              data: {
                source_version: input.sourceVersion,
                collection_name: input.set.collectionName,
                display_name: input.set.name,
                test_number: parseTestNumber(input.set.name, input.set.order),
                part: input.set.part,
                status: "DRAFT",
                published_at: null,
                item_count: input.set.items.length,
              },
              select: { id: true },
            })
          : await transaction.toeic_dictation_sets.create({
              data: {
                source: "dautoeic",
                source_set_id: input.set.sourceSetId,
                source_version: input.sourceVersion,
                collection_name: input.set.collectionName,
                display_name: input.set.name,
                test_number: parseTestNumber(input.set.name, input.set.order),
                part: input.set.part,
                status: "DRAFT",
                item_count: input.set.items.length,
              },
              select: { id: true },
            });

        await replaceSetContent(transaction, input, set.id);
        await transaction.toeic_dictation_sets.update({
          where: { id: set.id },
          data: { status: "PUBLISHED", published_at: now() },
        });
      });

      return "UPDATED";
    },
  };
}

function parseTestNumber(name: string, fallback: number) {
  const match = /test\s*(\d+)/iu.exec(name);
  const parsed = match ? Number(match[1]) : fallback;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error(`Invalid Dictation test number in set ${name}`);
  }
  return parsed;
}
