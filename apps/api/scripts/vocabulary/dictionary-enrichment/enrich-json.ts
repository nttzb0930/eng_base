import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATASET_PATH = path.join(
  process.cwd(),
  "..",
  "..",
  "data",
  "vocabulary",
  "vocabulary-catalog.json"
);

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_REQUEST_DELAY_MS = 1200;
const DEFAULT_RETRIES = 3;

type VocabularySeedItem = {
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  audioUrl?: string | null;
  audioSource?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  exampleSource?: string | null;
  examples?: string[];
  dictionaryLookupCompleted?: boolean;
};

type DictionaryPhonetic = {
  audio?: string;
};

type DictionaryDefinition = {
  example?: string;
};

type DictionaryMeaning = {
  definitions?: DictionaryDefinition[];
};

type DictionaryEntry = {
  phonetics?: DictionaryPhonetic[];
  meanings?: DictionaryMeaning[];
};

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

const normalizeAudioUrl = (audioUrl: string) => {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("//")) return `https:${audioUrl}`;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  return null;
};

const extractAudio = (payload: unknown): string | null => {
  if (!Array.isArray(payload)) return null;

  for (const rawEntry of payload) {
    if (!isRecord(rawEntry)) continue;
    const entry = rawEntry as DictionaryEntry;

    if (Array.isArray(entry.phonetics)) {
      for (const rawPhonetic of entry.phonetics) {
        if (!isRecord(rawPhonetic)) continue;
        const phonetic = rawPhonetic as DictionaryPhonetic;
        if (typeof phonetic.audio === "string") {
          const audioUrl = normalizeAudioUrl(phonetic.audio);
          if (audioUrl) return audioUrl;
        }
      }
    }
  }

  return null;
};

const normalizeExample = (example: string) => {
  const trimmed = example.trim().replace(/\s+/g, " ");
  if (trimmed.length < 12) return null;
  if (trimmed.length > 220) return null;
  return trimmed;
};

const extractExamples = (payload: unknown): string[] | null => {
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
        if (typeof definition.example === "string") {
          const example = normalizeExample(definition.example);
          if (example && !examples.includes(example)) {
            examples.push(example);
          }
        }
      }
    }
  }

  return examples.length > 0 ? examples : null;
};

const fetchFromDictionaryApi = async (word: string) => {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (response.status === 404) return null;
      if (response.status === 429 && attempt < DEFAULT_RETRIES) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!response.ok) {
        throw new Error(`Dictionary API responded with ${response.status}`);
      }

      const json = await response.json();
      const audioUrl = extractAudio(json);
      const examples = extractExamples(json);

      return { audioUrl, examples };
    } catch (err) {
      if (attempt === DEFAULT_RETRIES) throw err;
      await sleep(1000 * attempt);
    }
  }

  return null;
};

const main = async () => {
  const limit = getLimit();
  const concurrency = getConcurrency();
  const requestDelayMs = getRequestDelayMs();

  console.log("Reading dataset from vocabulary-catalog.json...");
  const raw = await readFile(DATASET_PATH, "utf8");
  const dataset: VocabularySeedItem[] = JSON.parse(raw);

  const pendingItems = dataset.filter(
    (item) => !item.dictionaryLookupCompleted
  );

  console.log(
    `Dataset statistics: Total: ${dataset.length}, Already enriched: ${dataset.length - pendingItems.length}, Pending: ${pendingItems.length}`
  );

  const itemsToProcess = limit ? pendingItems.slice(0, limit) : pendingItems;
  console.log(`Processing ${itemsToProcess.length} items with concurrency: ${concurrency}`);

  if (itemsToProcess.length === 0) {
    console.log("No pending items to process!");
    return;
  }

  let nextIndex = 0;
  let updatedCount = 0;
  let missingCount = 0;
  let failedCount = 0;

  // Save utility function to update the JSON file progressively
  const saveProgress = async () => {
    await writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  };

  const workers = Array.from({ length: Math.min(concurrency, itemsToProcess.length) }, async () => {
    while (nextIndex < itemsToProcess.length) {
      const item = itemsToProcess[nextIndex];
      nextIndex += 1;
      const currentIndex = nextIndex;

      try {
        const result = await fetchFromDictionaryApi(item.word);

        item.dictionaryLookupCompleted = true;

        if (result) {
          const hasAudio = !!result.audioUrl;
          const examplesCount = result.examples?.length || 0;
          
          if (result.audioUrl) {
            item.audioUrl = result.audioUrl;
            item.audioSource = "free-dictionary-api";
          }
          if (result.examples && result.examples.length > 0) {
            item.exampleEn = result.examples[0];
            item.exampleVi = null;
            item.exampleSource = "free-dictionary-api";
            item.examples = result.examples;
          }
          updatedCount += 1;
          console.log(`[${currentIndex}/${itemsToProcess.length}] ✓ Enriched "${item.word}" (Audio: ${hasAudio ? "Yes" : "No"}, Examples: ${examplesCount})`);
        } else {
          missingCount += 1;
          console.log(`[${currentIndex}/${itemsToProcess.length}] ✗ "${item.word}" not found in dictionary`);
        }
      } catch (error) {
        console.error(`[${currentIndex}/${itemsToProcess.length}] ! Failed "${item.word}":`, error instanceof Error ? error.message : error);
        failedCount += 1;
      }

      await sleep(requestDelayMs);

      // Periodically save every 10 updates to avoid losing progress
      if ((currentIndex % 10 === 0) || currentIndex === itemsToProcess.length) {
        console.log(`Saving progress... (${currentIndex}/${itemsToProcess.length} processed)`);
        await saveProgress();
      }
    }
  });

  await Promise.all(workers);
  await saveProgress();

  console.log("\nEnrichment Process Complete!");
  console.log(`- Updated: ${updatedCount} words`);
  console.log(`- Missing/Not found: ${missingCount} words`);
  console.log(`- Failed: ${failedCount} words`);
  console.log("All updates saved to vocabulary-catalog.json!");
};

main().catch(console.error);
