import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@prisma/client";

type DictionaryDefinition = {
  example?: unknown;
};

type DictionaryMeaning = {
  definitions?: unknown;
};

type DictionaryEntry = {
  meanings?: unknown;
};

type EnrichReport = {
  totalVocabularyItems: number;
  alreadyEnrichedExamples: number;
  pendingExamplesBeforeRun: number;
  requestedLimit: number | "all";
  selectedForRun: number;
  checked: number;
  updated: number;
  exampleRowsInserted: number;
  missingExample: number;
  failed: number;
  concurrency: number;
  requestDelayMs: number;
  examplesPerWord: number | "all";
  samples: {
    updated: Array<{ word: string; exampleEn: string }>;
    missingExample: string[];
    failed: Array<{ word: string; reason: string }>;
  };
};

type VocabularyItem = {
  id: number;
  word: string;
};

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_REQUEST_DELAY_MS = 300;
const DEFAULT_RETRIES = 4;
const DEFAULT_EXAMPLES_PER_WORD = "all";
const REPORT_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary",
  "working",
  "dictionary-enrichment",
  "example-enrichment-report.json"
);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const getNumberArg = (name: string) => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getLimit = () => {
  const index = process.argv.indexOf("--limit");
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value === "all") return null;

  return getNumberArg("--limit");
};

const getConcurrency = () => {
  return getNumberArg("--concurrency") ?? DEFAULT_CONCURRENCY;
};

const getRequestDelayMs = () => {
  return getNumberArg("--request-delay-ms") ?? DEFAULT_REQUEST_DELAY_MS;
};

const getExamplesPerWord = () => {
  const index = process.argv.indexOf("--examples-per-word");
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value === "all") return DEFAULT_EXAMPLES_PER_WORD;

  return getNumberArg("--examples-per-word") ?? DEFAULT_EXAMPLES_PER_WORD;
};

const sleep = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeExample = (example: string) => {
  const trimmed = example.trim().replace(/\s+/g, " ");

  if (trimmed.length < 12) return null;
  if (trimmed.length > 220) return null;
  return trimmed;
};

const getExamplesFromEntries = (
  payload: unknown,
  maxExamples: number | "all"
) => {
  if (!Array.isArray(payload)) return null;

  const examples: string[] = [];

  for (const rawEntry of payload) {
    if (!isRecord(rawEntry)) continue;

    const entry = rawEntry as DictionaryEntry;
    if (!Array.isArray(entry.meanings)) continue;

    for (const rawMeaning of entry.meanings) {
      if (!isRecord(rawMeaning)) continue;

      const meaning = rawMeaning as DictionaryMeaning;
      if (!Array.isArray(meaning.definitions)) continue;

      for (const rawDefinition of meaning.definitions) {
        if (!isRecord(rawDefinition)) continue;

        const definition = rawDefinition as DictionaryDefinition;
        if (typeof definition.example !== "string") continue;

        const example = normalizeExample(definition.example);
        if (example && !examples.includes(example)) {
          examples.push(example);
        }
        if (maxExamples !== "all" && examples.length >= maxExamples) {
          return examples;
        }
      }
    }
  }

  return examples.length > 0 ? examples : null;
};

const fetchDictionaryExamples = async (
  word: string,
  maxExamples: number | "all"
) => {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
    word
  )}`;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) return null;
    if (response.status === 429 && attempt < DEFAULT_RETRIES) {
      await sleep(1000 * attempt);
      continue;
    }
    if (!response.ok) {
      throw new Error(`Dictionary API responded with ${response.status}`);
    }

    return getExamplesFromEntries(await response.json(), maxExamples);
  }

  throw new Error("Dictionary API retry limit reached");
};

const enrichItem = async (
  item: VocabularyItem,
  maxExamples: number | "all",
  report: EnrichReport
) => {
  report.checked += 1;

  try {
    const examples = await fetchDictionaryExamples(item.word, maxExamples);

    if (!examples) {
      report.missingExample += 1;
      if (report.samples.missingExample.length < 20) {
        report.samples.missingExample.push(item.word);
      }
      return;
    }

    const exampleRows = examples.map((exampleEn, index) => ({
      vocabulary_item_id: item.id,
      example_en: exampleEn,
      example_vi: null,
      source: "free-dictionary-api",
      order: index + 1,
    }));

    const insertedExamples = await prisma.vocabulary_examples.createMany({
      data: exampleRows,
      skipDuplicates: true,
    });

    await prisma.vocabulary_items.update({
      where: {
        id: item.id,
      },
      data: {
        example_en: examples[0],
        example_vi: null,
        example_source: "free-dictionary-api",
      },
    });

    report.updated += 1;
    report.exampleRowsInserted += insertedExamples.count;
    if (report.samples.updated.length < 20) {
      report.samples.updated.push({ word: item.word, exampleEn: examples[0] });
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown error";

    report.failed += 1;
    if (report.samples.failed.length < 20) {
      report.samples.failed.push({ word: item.word, reason });
    }
  }
};

const processConcurrently = async (
  items: VocabularyItem[],
  concurrency: number,
  requestDelayMs: number,
  maxExamples: number | "all",
  report: EnrichReport
) => {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await enrichItem(item, maxExamples, report);
      await sleep(requestDelayMs);

      if (report.checked % 100 === 0) {
        console.log(
          `Example progress: ${report.checked}/${items.length} checked, ${report.updated} updated`
        );
      }
    }
  });

  await Promise.all(workers);
};

const main = async () => {
  const limit = getLimit();
  const concurrency = getConcurrency();
  const requestDelayMs = getRequestDelayMs();
  const maxExamples = getExamplesPerWord();
  const totalVocabularyItems = await prisma.vocabulary_items.count();
  const alreadyEnrichedExamples = await prisma.vocabulary_items.count({
    where: {
      example_en: {
        not: null,
      },
    },
  });
  const pendingExamplesBeforeRun =
    totalVocabularyItems - alreadyEnrichedExamples;
  const report: EnrichReport = {
    totalVocabularyItems,
    alreadyEnrichedExamples,
    pendingExamplesBeforeRun,
    requestedLimit: limit ?? "all",
    selectedForRun: 0,
    checked: 0,
    updated: 0,
    exampleRowsInserted: 0,
    missingExample: 0,
    failed: 0,
    concurrency,
    requestDelayMs,
    examplesPerWord: maxExamples,
    samples: {
      updated: [],
      missingExample: [],
      failed: [],
    },
  };

  const vocabularyItems = await prisma.vocabulary_items.findMany({
    where: {
      OR: [
        {
          example_en: null,
        },
        {
          vocabulary_examples: {
            none: {},
          },
        },
      ],
    },
    select: {
      id: true,
      word: true,
    },
    orderBy: {
      id: "asc",
    },
    ...(limit ? { take: limit } : {}),
  });

  report.selectedForRun = vocabularyItems.length;

  console.log(
    `Example resume: ${alreadyEnrichedExamples}/${totalVocabularyItems} already enriched, ${pendingExamplesBeforeRun} pending, ${vocabularyItems.length} selected this run`
  );

  await processConcurrently(
    vocabularyItems,
    concurrency,
    requestDelayMs,
    maxExamples,
    report
  );

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Example enrichment complete");
  console.log(JSON.stringify(report, null, 2));
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
