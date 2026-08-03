import { join, resolve } from "node:path";

import { resolveLicensedContentRoot } from "../../src/config/application.config";
import { PrismaService } from "../../src/database/prisma/prisma.service";
import { PrismaWritingAiRepository } from "../../src/module/toeic-writing/repository/prisma-writing-ai.repository";
import { createToeicWritingAiStorage } from "./toeic-writing-ai.storage";

function option(argv: string[], name: string): string | undefined {
  return argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
}

async function main() {
  const promptVersion = option(process.argv.slice(2), "prompt-version");
  const repositoryRoot = resolve(__dirname, "../../../..");
  const licensedRoot = resolveLicensedContentRoot(
    process.env.LICENSED_CONTENT_ROOT,
    join(repositoryRoot, "apps/api")
  );
  const storage = createToeicWritingAiStorage(join(licensedRoot, "writing-ai"));
  const candidates = (await storage.listCandidates()).filter(
    (candidate) => !promptVersion || candidate.promptVersion === promptVersion
  );
  const prisma = new PrismaService();
  const repository = new PrismaWritingAiRepository(prisma);
  const updated: string[] = [];
  const rejected: Array<{ sourceTaskId: string; reason: string }> = [];

  try {
    for (const candidate of candidates) {
      const task = await prisma.toeic_writing_tasks.findUnique({
        where: {
          source_source_task_id: {
            source: candidate.source,
            source_task_id: candidate.sourceTaskId,
          },
        },
        select: {
          id: true,
          source_version: true,
          image_sha256: true,
          part: true,
        },
      });
      if (!task) {
        rejected.push({
          sourceTaskId: candidate.sourceTaskId,
          reason: "TASK_NOT_FOUND",
        });
        continue;
      }
      if (
        task.part !== 1 ||
        task.source_version !== candidate.sourceVersion ||
        task.image_sha256 !== candidate.imageSha256
      ) {
        rejected.push({
          sourceTaskId: candidate.sourceTaskId,
          reason: "TASK_VERSION_OR_IMAGE_MISMATCH",
        });
        continue;
      }
      await repository.savePictureContext({
        taskId: task.id,
        imageSha256: candidate.imageSha256,
        promptVersion: candidate.promptVersion,
        model: candidate.model,
        context: candidate.context,
      });
      updated.push(candidate.sourceTaskId);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    JSON.stringify(
      { candidateCount: candidates.length, updated, rejected },
      null,
      2
    )
  );
  if (rejected.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error
          ? error.message
          : "Writing context import failed",
    })
  );
  process.exitCode = 1;
});
