import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import prisma from "../src/database/prisma/prisma.client";

type VocabularyAuditItem = {
  id: number;
  word: string;
  normalized_word: string;
  pos: string;
  pos_vi: string | null;
  cefr_level: string;
  phonetic: string | null;
  primary_meaning_vi: string;
  meaning_vi: string;
  example_en: string | null;
  example_vi: string | null;
};

const CORE_POS_MATCHERS: Partial<Record<string, string>> = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "phó từ",
};

const matchesPartOfSpeech = (item: VocabularyAuditItem) => {
  const expected = CORE_POS_MATCHERS[item.pos];
  if (!expected) return true;

  return (item.pos_vi ?? "").toLocaleLowerCase("vi").includes(expected);
};

const escapeCsv = (value: unknown) => {
  const text = Array.isArray(value)
    ? value.join(" | ")
    : value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
};

const main = async () => {
  const items = await prisma.vocabulary_items.findMany({
    select: {
      id: true,
      word: true,
      normalized_word: true,
      pos: true,
      pos_vi: true,
      cefr_level: true,
      phonetic: true,
      primary_meaning_vi: true,
      meaning_vi: true,
      example_en: true,
      example_vi: true,
    },
    orderBy: [{ cefr_level: "asc" }, { word: "asc" }],
  });

  const primaryMeaningCounts = new Map<string, number>();
  for (const item of items) {
    primaryMeaningCounts.set(
      item.primary_meaning_vi,
      (primaryMeaningCounts.get(item.primary_meaning_vi) ?? 0) + 1
    );
  }

  const records = items
    .map((item) => {
      const flags: string[] = [];
      const senseCount = item.meaning_vi.split(";").length;
      const meaningLength = item.meaning_vi.length;
      let riskScore = 0;

      if (!matchesPartOfSpeech(item)) {
        flags.push("POS_MISMATCH");
        riskScore += 3;
      }

      if (senseCount >= 5) {
        flags.push("MANY_SENSES");
        riskScore += 2;
      }

      if (meaningLength > 300) {
        flags.push("LONG_MEANING");
        riskScore += 2;
      }

      if (/[+(),]|\.\.\./.test(item.primary_meaning_vi)) {
        flags.push("NOISY_PRIMARY_MEANING");
        riskScore += 2;
      }

      if (item.primary_meaning_vi.length > 40) {
        flags.push("LONG_PRIMARY_MEANING");
        riskScore += 1;
      }

      if (!item.example_en) {
        flags.push("MISSING_EXAMPLE");
        riskScore += 1;
      }

      if ((primaryMeaningCounts.get(item.primary_meaning_vi) ?? 0) > 1) {
        flags.push("DUPLICATE_PRIMARY_MEANING");
        riskScore += 1;
      }

      return {
        ...item,
        risk_score: riskScore,
        flags,
        sense_count: senseCount,
        meaning_length: meaningLength,
      };
    })
    .filter((item) => item.risk_score >= 5)
    .sort(
      (left, right) =>
        right.risk_score - left.risk_score ||
        right.meaning_length - left.meaning_length ||
        left.word.localeCompare(right.word)
    );

  const root = path.resolve(process.cwd(), "..", "..");
  const outputDirectory = path.join(root, "data", "vocabulary");
  const jsonPath = path.join(outputDirectory, "vocab-risk-audit.json");
  const csvPath = path.join(outputDirectory, "vocab-risk-audit.csv");

  const exportedAt = new Date().toISOString();
  const jsonOutput = {
    exportedAt,
    source: "vocabulary_items",
    threshold: 5,
    totalVocabularyItems: items.length,
    totalRiskRecords: records.length,
    scoring: {
      POS_MISMATCH: 3,
      MANY_SENSES: 2,
      LONG_MEANING: 2,
      NOISY_PRIMARY_MEANING: 2,
      LONG_PRIMARY_MEANING: 1,
      MISSING_EXAMPLE: 1,
      DUPLICATE_PRIMARY_MEANING: 1,
    },
    records,
  };

  const csvColumns = [
    "id",
    "word",
    "normalized_word",
    "cefr_level",
    "pos",
    "pos_vi",
    "phonetic",
    "risk_score",
    "flags",
    "sense_count",
    "meaning_length",
    "primary_meaning_vi",
    "meaning_vi",
    "example_en",
    "example_vi",
  ] as const;
  const csvRows = [
    csvColumns.map(escapeCsv).join(","),
    ...records.map((record) =>
      csvColumns
        .map((column) => escapeCsv(record[column]))
        .join(",")
    ),
  ];

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(jsonOutput, null, 2)}\n`, "utf8"),
    writeFile(csvPath, `\uFEFF${csvRows.join("\n")}\n`, "utf8"),
  ]);

  console.log(
    JSON.stringify(
      {
        totalVocabularyItems: items.length,
        exportedRiskRecords: records.length,
        jsonPath,
        csvPath,
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
