import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import prisma from "../support/script-prisma.js";
import { importToeicVocabularyCache } from "./toeic-vocabulary-cache.import.js";
import { createPrismaToeicVocabularyCacheImportStore } from "./toeic-vocabulary-cache.prisma-store.js";
import { sha256 as fingerprint } from "./toeic-vocabulary-cache.storage.js";

function approvedSha256(argv: string[]) {
  const prefix = "--approved-sha=";
  const values = argv
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length).trim());
  if (values.length !== 1 || !/^[a-f0-9]{64}$/u.test(values[0] ?? "")) {
    throw new Error("Exactly one lowercase --approved-sha is required");
  }
  return values[0]!;
}

async function main() {
  try {
    const sha256 = approvedSha256(process.argv.slice(2));
    const repositoryRoot = resolve(__dirname, "../../../..");
    const inventory = JSON.parse(
      await readFile(
        resolve(
          repositoryRoot,
          "var",
          "licensed-content",
          "dautoeic",
          "inventories",
          "toeic-vocabulary-cache",
          `${sha256}.json`
        ),
        "utf8"
      )
    ) as Record<string, unknown>;
    const deterministic = { ...inventory };
    const embeddedSha256 = deterministic.inventorySha256;
    delete deterministic.observedAt;
    delete deterministic.inventorySha256;
    if (embeddedSha256 !== sha256 || fingerprint(deterministic) !== sha256) {
      throw new Error("Approved vocabulary inventory checksum does not match");
    }
    const result = await importToeicVocabularyCache(
      inventory,
      createPrismaToeicVocabularyCacheImportStore(prisma)
    );
    console.log(
      JSON.stringify(
        {
          result,
          inventorySha256: sha256,
          importedQuestionCount: Object.keys(
            inventory.entries as Record<string, unknown>
          ).length,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "TOEIC vocabulary import failed"
  );
  process.exitCode = 1;
});
