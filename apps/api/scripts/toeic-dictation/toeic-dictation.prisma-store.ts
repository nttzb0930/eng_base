import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  ToeicDictationImportSet,
  ToeicDictationImportStore,
} from "./toeic-dictation.import.js";

const ORDER_OFFSET = 1_000_000;
const ITEM_BATCH_SIZE = 200;

function buildItemRows(
  input: ToeicDictationImportSet,
  setId: number
): Prisma.Sql[] {
  return input.set.items.map((item) => {
    if (!item.audioUrl) {
      throw new Error(`Dictation item ${item.sourceItemId} has no audio URL`);
    }
    const media = input.mediaByUrl[item.audioUrl];
    if (!media) {
      throw new Error(`Dictation item ${item.sourceItemId} has no local media`);
    }
    return Prisma.sql`(
      ${setId},
      ${item.sourceItemId},
      ${input.sourceVersion},
      ${item.order},
      ${item.groupId},
      ${item.transcript!.trim()},
      ${item.translationVi},
      ${media.sha256},
      ${media.storagePath},
      ${media.sha256},
      ${media.bytes},
      ${media.contentType},
      ${item.durationSeconds ? Math.round(item.durationSeconds * 1000) : null},
      ${"VALID"},
      ${true}
    )`;
  });
}

async function bulkUpsertItems(
  transaction: Prisma.TransactionClient,
  rows: Prisma.Sql[]
) {
  for (let offset = 0; offset < rows.length; offset += ITEM_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + ITEM_BATCH_SIZE);
    await transaction.$executeRaw(Prisma.sql`
      INSERT INTO "toeic_dictation_items" (
        "set_id",
        "source_item_id",
        "source_version",
        "order_index",
        "source_group",
        "transcript",
        "translation_vi",
        "audio_asset_id",
        "audio_storage_path",
        "audio_sha256",
        "audio_bytes",
        "audio_content_type",
        "audio_duration_ms",
        "validation_status",
        "is_active"
      )
      VALUES ${Prisma.join(batch)}
      ON CONFLICT ("set_id", "source_item_id") DO UPDATE SET
        "source_version" = EXCLUDED."source_version",
        "order_index" = EXCLUDED."order_index",
        "source_group" = EXCLUDED."source_group",
        "transcript" = EXCLUDED."transcript",
        "translation_vi" = EXCLUDED."translation_vi",
        "audio_asset_id" = EXCLUDED."audio_asset_id",
        "audio_storage_path" = EXCLUDED."audio_storage_path",
        "audio_sha256" = EXCLUDED."audio_sha256",
        "audio_bytes" = EXCLUDED."audio_bytes",
        "audio_content_type" = EXCLUDED."audio_content_type",
        "audio_duration_ms" = EXCLUDED."audio_duration_ms",
        "validation_status" = EXCLUDED."validation_status",
        "is_active" = EXCLUDED."is_active",
        "updated_at" = CURRENT_TIMESTAMP
    `);
  }
}

async function replaceSetContent(
  transaction: Prisma.TransactionClient,
  input: ToeicDictationImportSet,
  setId: number
) {
  const rows = buildItemRows(input, setId);

  await transaction.toeic_dictation_items.updateMany({
    where: { set_id: setId },
    data: {
      order_index: { increment: ORDER_OFFSET },
      is_active: false,
    },
  });

  await bulkUpsertItems(transaction, rows);
}

export function createPrismaToeicDictationImportStore(
  prisma: PrismaClient,
  now: () => Date = () => new Date()
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

      await prisma.$transaction(
        async (transaction) => {
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
        },
        {
          maxWait: 10_000,
          timeout: 120_000,
        }
      );

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
