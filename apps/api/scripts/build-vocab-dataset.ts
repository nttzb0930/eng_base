import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CefrLevel = "A1" | "A2" | "B1" | "B2";

type CefrRow = {
  headword: string;
  pos: string;
  cefrLevel: CefrLevel;
};

type DictionaryEntry = {
  word: string;
  normalizedWord: string;
  phonetic: string | null;
  posVi: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
};

type VocabularyItem = {
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: CefrLevel;
  phonetic: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: "words-cefr-dictionary";
};

type Report = {
  loadedCefrRows: number;
  parsedDictionaryEntries: number;
  validDictionaryEntries: number;
  matchedWordsWithMeaning: number;
  skipped: {
    noMeaning: number;
    invalidWord: number;
    duplicateWord: number;
    invalidMeaning: number;
    unsupportedLevel: number;
  };
  quota: Record<CefrLevel, { target: number; actual: number }>;
  samples: {
    parsedEntries: DictionaryEntry[];
    skippedNoMeaning: string[];
  };
};

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2"];
const QUOTA: Record<CefrLevel, number> = {
  A1: 600,
  A2: 800,
  B1: 900,
  B2: 700,
};

const ROOT = path.resolve(process.cwd(), "..", "..");
const DEFAULT_CEFR_PATH = path.join(
  "C:",
  "Users",
  "nttzb",
  "Downloads",
  "New folder",
  "Words-CEFR-Dataset",
  "datasets",
  "word_list_cefr.csv"
);
const DEFAULT_DICTIONARY_PATH = path.join(
  "C:",
  "Users",
  "nttzb",
  "Downloads",
  "New folder",
  "English-Vietnamese-Dictionary",
  "data",
  "english-vietnamese.txt"
);
const OUTPUT_DIR = path.join(ROOT, "data", "vocabulary");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "phase1-vocabulary.json");
const OUTPUT_REPORT = path.join(OUTPUT_DIR, "phase1-vocabulary-report.json");

const cefrPath = process.env.CEFR_WORDLIST_PATH || DEFAULT_CEFR_PATH;
const dictionaryPath = process.env.VI_DICTIONARY_PATH || DEFAULT_DICTIONARY_PATH;

const normalizeWord = (word: string) => word.trim().toLowerCase();

const isValidWord = (word: string) => {
  const normalized = normalizeWord(word);
  if (normalized.length < 2 || normalized.length > 32) return false;
  if (normalized.includes(" ")) return false;
  if (!/^[a-z][a-z'-]*[a-z]$/.test(normalized)) return false;
  if (normalized.includes("--") || normalized.includes("''")) return false;
  return true;
};

const isValidMeaning = (meaning: string) => {
  const trimmed = meaning.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return false;
  if (trimmed.includes("=") || trimmed.includes("@")) return false;
  if (/[<>]/.test(trimmed)) return false;
  if (!/[a-zA-ZÀ-ỹ]/.test(trimmed)) return false;
  return true;
};

const toPrimaryMeaning = (meaning: string) => {
  const primary = meaning
    .split(/[,;\/]/)[0]
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/^\[[^\]]*\]\s*/, "")
    .trim();

  return primary;
};

const parseDelimitedLine = (line: string, delimiter: "," | ";") => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
};

const parseCefrRows = (csv: string, report: Report): CefrRow[] => {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const rows: CefrRow[] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(1)) {
    report.loadedCefrRows += 1;
    const [headword, pos, cefrLevel] = parseDelimitedLine(line, ";");
    const level = cefrLevel as CefrLevel;
    const normalizedWord = normalizeWord(headword);

    if (!LEVELS.includes(level)) {
      report.skipped.unsupportedLevel += 1;
      continue;
    }

    if (!isValidWord(normalizedWord)) {
      report.skipped.invalidWord += 1;
      continue;
    }

    if (seen.has(normalizedWord)) {
      report.skipped.duplicateWord += 1;
      continue;
    }

    seen.add(normalizedWord);
    rows.push({
      headword: normalizedWord,
      pos: pos.trim().toLowerCase(),
      cefrLevel: level,
    });
  }

  return rows;
};

const parseDictionary = (content: string, report: Report) => {
  const entries = new Map<string, DictionaryEntry>();
  const lines = content.split(/\r?\n/);

  let current:
    | {
        word: string;
        normalizedWord: string;
        phonetic: string | null;
        posVi: string | null;
        meanings: string[];
      }
    | null = null;

  const flush = () => {
    if (!current) return;
    report.parsedDictionaryEntries += 1;

    const meaningVi = current.meanings.join("; ").trim();
    const primaryMeaningVi = toPrimaryMeaning(meaningVi);

    if (!meaningVi || !primaryMeaningVi) {
      report.skipped.noMeaning += 1;
      current = null;
      return;
    }

    if (!isValidMeaning(primaryMeaningVi)) {
      report.skipped.invalidMeaning += 1;
      current = null;
      return;
    }

    const entry: DictionaryEntry = {
      word: current.word,
      normalizedWord: current.normalizedWord,
      phonetic: current.phonetic,
      posVi: current.posVi,
      meaningVi,
      primaryMeaningVi,
    };

    if (!entries.has(entry.normalizedWord)) {
      entries.set(entry.normalizedWord, entry);
      report.validDictionaryEntries += 1;

      if (report.samples.parsedEntries.length < 5) {
        report.samples.parsedEntries.push(entry);
      }
    }

    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("@")) {
      flush();

      const match = line.match(/^@(.+?)(\s+\/.+\/)?$/);
      const word = match?.[1]?.trim() ?? "";
      const normalizedWord = normalizeWord(word);

      if (!isValidWord(normalizedWord)) {
        current = null;
        continue;
      }

      current = {
        word: normalizedWord,
        normalizedWord,
        phonetic: match?.[2]?.trim() ?? null,
        posVi: null,
        meanings: [],
      };

      continue;
    }

    if (!current) continue;

    if (line.startsWith("*")) {
      current.posVi = line.replace(/^\*\s*/, "").trim() || current.posVi;
      continue;
    }

    if (line.startsWith("-")) {
      const meaning = line
        .replace(/^-\s*/, "")
        .replace(/^\([^)]*\)\s*/, "")
        .trim();

      if (isValidMeaning(meaning)) {
        current.meanings.push(meaning);
      }
    }
  }

  flush();
  return entries;
};

const isNearLevel = (level: CefrLevel, target: CefrLevel) => {
  return Math.abs(LEVELS.indexOf(level) - LEVELS.indexOf(target)) === 1;
};

const buildVocabulary = (
  cefrRows: CefrRow[],
  dictionary: Map<string, DictionaryEntry>,
  report: Report
) => {
  const candidates: VocabularyItem[] = [];

  for (const row of cefrRows) {
    const entry = dictionary.get(row.headword);

    if (!entry) {
      report.skipped.noMeaning += 1;
      if (report.samples.skippedNoMeaning.length < 10) {
        report.samples.skippedNoMeaning.push(row.headword);
      }
      continue;
    }

    candidates.push({
      word: row.headword,
      normalizedWord: row.headword,
      pos: row.pos,
      posVi: entry.posVi,
      cefrLevel: row.cefrLevel,
      phonetic: entry.phonetic,
      meaningVi: entry.meaningVi,
      primaryMeaningVi: entry.primaryMeaningVi,
      source: "words-cefr-dictionary",
    });
  }

  report.matchedWordsWithMeaning = candidates.length;

  const selected: VocabularyItem[] = [];
  const selectedWords = new Set<string>();

  for (const level of LEVELS) {
    const levelCandidates = candidates.filter(
      (item) => item.cefrLevel === level && !selectedWords.has(item.normalizedWord)
    );
    const picked = levelCandidates.slice(0, QUOTA[level]);

    for (const item of picked) {
      selected.push(item);
      selectedWords.add(item.normalizedWord);
    }

    report.quota[level].actual = picked.length;
  }

  for (const level of LEVELS) {
    while (report.quota[level].actual < QUOTA[level]) {
      const fallback = candidates.find(
        (item) =>
          !selectedWords.has(item.normalizedWord) &&
          (item.cefrLevel === level || isNearLevel(item.cefrLevel, level))
      );

      if (!fallback) break;

      selected.push(fallback);
      selectedWords.add(fallback.normalizedWord);
      report.quota[level].actual += 1;
    }
  }

  return selected;
};

const main = async () => {
  const report: Report = {
    loadedCefrRows: 0,
    parsedDictionaryEntries: 0,
    validDictionaryEntries: 0,
    matchedWordsWithMeaning: 0,
    skipped: {
      noMeaning: 0,
      invalidWord: 0,
      duplicateWord: 0,
      invalidMeaning: 0,
      unsupportedLevel: 0,
    },
    quota: {
      A1: { target: QUOTA.A1, actual: 0 },
      A2: { target: QUOTA.A2, actual: 0 },
      B1: { target: QUOTA.B1, actual: 0 },
      B2: { target: QUOTA.B2, actual: 0 },
    },
    samples: {
      parsedEntries: [],
      skippedNoMeaning: [],
    },
  };

  const [cefrCsv, dictionaryText] = await Promise.all([
    readFile(cefrPath, "utf8"),
    readFile(dictionaryPath, "utf8"),
  ]);

  const cefrRows = parseCefrRows(cefrCsv, report);
  const dictionary = parseDictionary(dictionaryText, report);
  const vocabulary = buildVocabulary(cefrRows, dictionary, report);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(OUTPUT_JSON, `${JSON.stringify(vocabulary, null, 2)}\n`, "utf8"),
    writeFile(OUTPUT_REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);

  console.log("Vocabulary dataset built");
  console.log({
    cefrPath,
    dictionaryPath,
    output: OUTPUT_JSON,
    report: OUTPUT_REPORT,
    totalVocabularyItems: vocabulary.length,
    ...report,
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
