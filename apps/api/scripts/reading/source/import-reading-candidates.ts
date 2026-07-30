import { sha256Text, stableJson } from "./reading-source.canonical.js";
import { Prisma } from "@prisma/client";
import {
  importReadingSourceCandidates,
  type ReadingCandidateImportStore,
} from "./reading-source.import.js";
import { loadReadingSourceRuntime } from "./reading-source.cli.js";
import prisma from "../../support/script-prisma.js";

const store: ReadingCandidateImportStore = {
  async importOne(sourcePackage, manifest) {
    const identity = {
      source: sourcePackage.source,
      source_id: sourcePackage.sourceId,
      source_version: sourcePackage.sourceVersion,
    };
    const existing = await prisma.reading_source_candidates.findUnique({
      where: { source_source_id_source_version: identity },
      select: { content_sha256: true, status: true },
    });
    const contentSha256 = sha256Text(stableJson(sourcePackage));
    if (existing) {
      if (existing.status !== "PENDING") return "IMMUTABLE_SKIPPED";
      if (existing.content_sha256 === contentSha256) return "UNCHANGED";
      throw new Error("Existing candidate version has a checksum conflict");
    }
    await prisma.reading_source_candidates.create({
      data: {
        ...identity,
        content_sha256: contentSha256,
        access_classification: manifest.accessClassification,
        license_name: manifest.license.name,
        license_reference: manifest.license.reference,
        license_intended_use: manifest.license.intendedUse,
        approved_inventory_sha256: manifest.approvedInventorySha256,
        source_level: sourcePackage.sourceLevel,
        source_title: sourcePackage.title,
        source_topic: sourcePackage.sourceTopic,
        source_html: sourcePackage.sourceHtml,
        plain_text_draft: sourcePackage.plainTextDraft,
        canonical_json: JSON.parse(
          stableJson(sourcePackage),
        ) as Prisma.InputJsonValue,
        status: "PENDING",
      },
    });
    return "CREATED";
  },
};

async function main() {
  try {
    const summary = await importReadingSourceCandidates({
      storage: loadReadingSourceRuntime({
        argv: process.argv.slice(2),
      }).storage,
      store,
    });
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed.length > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Candidate import failed");
  process.exitCode = 1;
});
