import type { Prisma, PrismaClient } from "@prisma/client";

import type { ToeicWritingImportStore } from "./toeic-writing.import.js";

export function createPrismaToeicWritingImportStore(
  prisma: PrismaClient,
  now: () => Date = () => new Date()
): ToeicWritingImportStore {
  return {
    async importOne(task) {
      const course = await prisma.courses.findUnique({
        where: { code: "toeic-600" },
        select: { id: true },
      });
      if (!course) throw new Error("Course toeic-600 does not exist");

      const existing = await prisma.toeic_writing_tasks.findUnique({
        where: {
          source_source_task_id: {
            source: task.source,
            source_task_id: task.sourceTaskId,
          },
        },
        select: {
          content_sha256: true,
          status: true,
        },
      });
      if (
        existing?.content_sha256 === task.contentSha256 &&
        existing.status === "PUBLISHED"
      ) {
        return "SKIPPED";
      }

      await prisma.$transaction(async (transaction) => {
        const sourceSetId = `part-${task.part}`;
        const set = await transaction.toeic_writing_sets.upsert({
          where: {
            course_id_source_source_set_id: {
              course_id: course.id,
              source: task.source,
              source_set_id: sourceSetId,
            },
          },
          create: {
            course_id: course.id,
            source: task.source,
            source_set_id: sourceSetId,
            title: `TOEIC Writing Part ${task.part}`,
            order_index: task.part,
          },
          update: {
            title: `TOEIC Writing Part ${task.part}`,
            order_index: task.part,
          },
          select: { id: true },
        });
        const media =
          task.part === 1
            ? {
                image_storage_path: task.media.storageKey,
                image_sha256: task.media.sha256,
                image_bytes: task.media.bytes,
                image_content_type: task.media.mimeType,
              }
            : {
                image_storage_path: null,
                image_sha256: null,
                image_bytes: null,
                image_content_type: null,
              };
        const sourceData = {
          set_id: set.id,
          part: task.part,
          order_index: task.order,
          title: task.title,
          difficulty: task.difficulty,
          instructions_en: task.instructionsEn,
          instructions_vi: task.instructionsVi,
          payload: task.payload as Prisma.InputJsonValue,
          ...media,
          source_version: task.sourceVersion,
          content_sha256: task.contentSha256,
          provenance: {
            schemaVersion: task.schemaVersion,
            retrievedAt: task.retrievedAt,
            sourceVersion: task.sourceVersion,
          },
          license_reference: task.licenseReference,
          status: "PUBLISHED" as const,
          published_at: now(),
        };

        await transaction.toeic_writing_tasks.upsert({
          where: {
            source_source_task_id: {
              source: task.source,
              source_task_id: task.sourceTaskId,
            },
          },
          create: {
            source: task.source,
            source_task_id: task.sourceTaskId,
            ...sourceData,
          },
          update: sourceData,
        });
      });

      return "UPDATED";
    },
  };
}
