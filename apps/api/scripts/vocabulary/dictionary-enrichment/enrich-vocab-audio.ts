import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../../../src/database/prisma/prisma.config.js";

type DictionaryPhonetic = {
  text?: unknown;
  audio?: unknown;
};

type DictionaryEntry = {
  phonetic?: unknown;
  phonetics?: unknown;
};

type EnrichReport = {
  totalVocabularyItems: number;
  alreadyEnrichedAudio: number;
  pendingAudioBeforeRun: number;
  requestedLimit: number | "all";
  selectedForRun: number;
  checked: number;
  updated: number;
  missingAudio: number;
  failed: number;
  concurrency: number;
  requestDelayMs: number;
  samples: {
    updated: Array<{ word: string; audioUrl: string }>;
    missingAudio: string[];
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
const REPORT_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary",
  "working",
  "dictionary-enrichment",
  "audio-enrichment-report.json"
);

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
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

const sleep = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isDictionaryEntry = (value: unknown): value is DictionaryEntry => {
  return isRecord(value);
};

const normalizeAudioUrl = (audioUrl: string) => {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("//")) return `https:${audioUrl}`;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  return null;
};

const getAudioFromEntries = (payload: unknown) => {
  if (!Array.isArray(payload)) return null;

  for (const rawEntry of payload) {
    if (!isDictionaryEntry(rawEntry)) continue;

    if (Array.isArray(rawEntry.phonetics)) {
      for (const rawPhonetic of rawEntry.phonetics) {
        if (!isRecord(rawPhonetic)) continue;

        const phonetic = rawPhonetic as DictionaryPhonetic;
        if (typeof phonetic.audio !== "string") continue;

        const audioUrl = normalizeAudioUrl(phonetic.audio);
        if (audioUrl) return audioUrl;
      }
    }
  }

  return null;
};

const fetchDictionaryAudio = async (word: string) => {
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

    return getAudioFromEntries(await response.json());
  }

  throw new Error("Dictionary API retry limit reached");
};

const enrichItem = async (item: VocabularyItem, report: EnrichReport) => {
  report.checked += 1;

  try {
    const audioUrl = await fetchDictionaryAudio(item.word);

    if (!audioUrl) {
      report.missingAudio += 1;
      if (report.samples.missingAudio.length < 20) {
        report.samples.missingAudio.push(item.word);
      }
      return;
    }

    await prisma.vocabulary_items.update({
      where: {
        id: item.id,
      },
      data: {
        audio_url: audioUrl,
        audio_source: "free-dictionary-api",
      },
    });

    report.updated += 1;
    if (report.samples.updated.length < 20) {
      report.samples.updated.push({ word: item.word, audioUrl });
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
  report: EnrichReport
) => {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await enrichItem(item, report);
      await sleep(requestDelayMs);

      if (report.checked % 100 === 0) {
        console.log(
          `Audio progress: ${report.checked}/${items.length} checked, ${report.updated} updated`
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
  const totalVocabularyItems = await prisma.vocabulary_items.count();
  const alreadyEnrichedAudio = await prisma.vocabulary_items.count({
    where: {
      audio_url: {
        not: null,
      },
    },
  });
  const pendingAudioBeforeRun = totalVocabularyItems - alreadyEnrichedAudio;
  const report: EnrichReport = {
    totalVocabularyItems,
    alreadyEnrichedAudio,
    pendingAudioBeforeRun,
    requestedLimit: limit ?? "all",
    selectedForRun: 0,
    checked: 0,
    updated: 0,
    missingAudio: 0,
    failed: 0,
    concurrency,
    requestDelayMs,
    samples: {
      updated: [],
      missingAudio: [],
      failed: [],
    },
  };

  const vocabularyItems = await prisma.vocabulary_items.findMany({
    where: {
      audio_url: null,
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
    `Audio resume: ${alreadyEnrichedAudio}/${totalVocabularyItems} already enriched, ${pendingAudioBeforeRun} pending, ${vocabularyItems.length} selected this run`
  );

  await processConcurrently(
    vocabularyItems,
    concurrency,
    requestDelayMs,
    report
  );

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Audio enrichment complete");
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
