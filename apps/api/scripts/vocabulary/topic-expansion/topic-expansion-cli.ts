import type {
  TopicCandidateEnrichmentTier,
  TopicDeficit,
  TopicExpansionArtifact,
} from "./topic-expansion.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

export type TopicExpansionArguments = {
  json: boolean;
  topicSlug: string | null;
  chunks: number;
  chunkSize: number | null;
};

export type TopicExpansionQueueArguments = {
  json: boolean;
  workers: number;
  chunksPerTopic: number;
  chunkSize: number | null;
};

export type TopicCandidateGenerationArguments = {
  json: boolean;
  topicSlug: string;
  count: number;
  chunkSize: number;
};

export type TopicCandidateReviewArguments = {
  json: boolean;
  topicSlug: string;
  all: boolean;
  chunkFileName: string | null;
};

export type TopicCandidateEnrichmentArguments = {
  json: boolean;
  topicSlug: string;
  limit: number;
  chunkSize: number;
  tier: TopicCandidateEnrichmentTier;
};

export type TopicCandidateQueueArguments = {
  json: boolean;
  workers: number;
  count: number;
};

export type TopicExpansionQueueJob = {
  topicSlug: string;
  requestedCount: number;
  chunks: number;
};

export type TopicExpansionWorkerCommand = {
  command: string;
  args: string[];
};

export type TopicDeficitReportEntry = TopicDeficit & {
  title: string;
  titleVi: string;
};

export type TopicDeficitReportGroup = {
  group: string;
  groupVi: string;
  topics: TopicDeficitReportEntry[];
};

export type TopicDeficitReport = {
  schemaVersion: 1;
  action: "vocabulary-topic-expansion-deficits";
  minimumWords: number;
  totalTopics: number;
  deficientTopics: number;
  emptyTopics: number;
  requestedNewWords: number;
  catalogItems: number;
  groups: TopicDeficitReportGroup[];
  providerCalled: false;
  databaseUpdated: false;
};

export type TopicExpansionRequest = {
  totalMissingWords: number;
  requestedWords: number;
  chunkSize: number;
  chunked: boolean;
};

export type TopicExpansionEvent = {
  event:
    | "run-start"
    | "provider-request-start"
    | "provider-response-received"
    | "validation-start"
    | "validation-success"
    | "validation-failed"
    | "artifact-written";
  topic: string;
  durationMs?: number;
  requestedWords?: number;
  generatedWords?: number;
  outputPath?: string;
  errorCount?: number;
  chunkSize?: number;
  totalMissingWords?: number;
  chunked?: boolean;
};

export type TopicExpansionExclusionWord = {
  word: string;
  pos: string;
};

export function parseTopicExpansionArguments(
  args: string[]
): TopicExpansionArguments {
  let json = false;
  let chunks = 1;
  let chunkSize: number | null = null;
  const topicSlugs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--chunks") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunks requires a value");
      chunks = parsePositiveIntegerFlag("--chunks", value);
      index += 1;
      continue;
    }
    if (argument === "--chunk-size") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunk-size requires a value");
      chunkSize = parsePositiveIntegerFlag("--chunk-size", value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic expansion flag "${argument}"`);
    }
    topicSlugs.push(argument);
  }

  if (topicSlugs.length > 1) {
    throw new Error("Topic expansion accepts at most one Topic slug");
  }

  return { json, topicSlug: topicSlugs[0] ?? null, chunks, chunkSize };
}

export function parseTopicExpansionQueueArguments(
  args: string[]
): TopicExpansionQueueArguments {
  let json = false;
  let workers = 1;
  let chunksPerTopic = 10;
  let chunkSize: number | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--workers") {
      const value = args[index + 1];
      if (!value) throw new Error("--workers requires a value");
      workers = parsePositiveIntegerFlag("--workers", value);
      index += 1;
      continue;
    }
    if (argument === "--chunks-per-topic") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunks-per-topic requires a value");
      chunksPerTopic = parsePositiveIntegerFlag("--chunks-per-topic", value);
      index += 1;
      continue;
    }
    if (argument === "--chunk-size") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunk-size requires a value");
      chunkSize = parsePositiveIntegerFlag("--chunk-size", value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic expansion queue flag "${argument}"`);
    }
    throw new Error(
      "Topic expansion queue does not accept positional Topic slugs"
    );
  }

  return { json, workers, chunksPerTopic, chunkSize };
}

export function parseTopicCandidateGenerationArguments(
  args: string[]
): TopicCandidateGenerationArguments {
  let json = false;
  let count = 50;
  let chunkSize = 50;
  const topicSlugs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--count") {
      const value = args[index + 1];
      if (!value) throw new Error("--count requires a value");
      count = parsePositiveIntegerFlag("--count", value);
      index += 1;
      continue;
    }
    if (argument === "--chunk-size") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunk-size requires a value");
      chunkSize = parsePositiveIntegerFlag("--chunk-size", value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic candidate generation flag "${argument}"`);
    }
    topicSlugs.push(argument);
  }

  if (topicSlugs.length < 1) {
    throw new Error("Topic slug is required");
  }
  if (topicSlugs.length > 1) {
    throw new Error(
      "Topic candidate generation accepts exactly one Topic slug"
    );
  }

  return { json, topicSlug: topicSlugs[0]!, count, chunkSize };
}

export function parseTopicCandidateReviewArguments(
  args: string[]
): TopicCandidateReviewArguments {
  let json = false;
  let all = false;
  let chunkFileName: string | null = null;
  const topicSlugs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--all") {
      all = true;
      continue;
    }
    if (argument === "--chunk") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunk requires a value");
      if (!/^chunk-\d{3}\.json$/u.test(value)) {
        throw new Error("--chunk must be a chunk-001.json style file name");
      }
      chunkFileName = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic candidate review flag "${argument}"`);
    }
    topicSlugs.push(argument);
  }

  if (topicSlugs.length < 1) throw new Error("Topic slug is required");
  if (topicSlugs.length > 1) {
    throw new Error("Topic candidate review accepts exactly one Topic slug");
  }
  if (all === (chunkFileName !== null)) {
    throw new Error("Topic candidate review requires --all or --chunk");
  }

  return { json, topicSlug: topicSlugs[0]!, all, chunkFileName };
}

export function parseTopicCandidateEnrichmentArguments(
  args: string[]
): TopicCandidateEnrichmentArguments {
  let json = false;
  let limit = 30;
  let chunkSize = 5;
  let tier: TopicCandidateEnrichmentTier = "all";
  const topicSlugs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--limit") {
      const value = args[index + 1];
      if (!value) throw new Error("--limit requires a value");
      limit = parsePositiveIntegerFlag("--limit", value);
      index += 1;
      continue;
    }
    if (argument === "--chunk-size") {
      const value = args[index + 1];
      if (!value) throw new Error("--chunk-size requires a value");
      chunkSize = parsePositiveIntegerFlag("--chunk-size", value);
      index += 1;
      continue;
    }
    if (argument === "--tier") {
      const value = args[index + 1];
      if (!value) throw new Error("--tier requires a value");
      if (value !== "core" && value !== "supporting" && value !== "all") {
        throw new Error("--tier must be core, supporting, or all");
      }
      tier = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic candidate enrichment flag "${argument}"`);
    }
    topicSlugs.push(argument);
  }

  if (topicSlugs.length < 1) throw new Error("Topic slug is required");
  if (topicSlugs.length > 1) {
    throw new Error(
      "Topic candidate enrichment accepts exactly one Topic slug"
    );
  }

  return { json, topicSlug: topicSlugs[0]!, limit, chunkSize, tier };
}

export function parseTopicCandidateQueueArguments(
  args: string[]
): TopicCandidateQueueArguments {
  let json = false;
  let workers = 1;
  let count = 20;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--workers") {
      const value = args[index + 1];
      if (!value) throw new Error("--workers requires a value");
      workers = parsePositiveIntegerFlag("--workers", value);
      index += 1;
      continue;
    }
    if (argument === "--count") {
      const value = args[index + 1];
      if (!value) throw new Error("--count requires a value");
      count = parsePositiveIntegerFlag("--count", value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown Topic candidate queue flag "${argument}"`);
    }
    throw new Error("Topic candidate queue does not accept positional slugs");
  }

  return { json, workers, count };
}

export function createTopicExpansionQueueJobs(
  deficits: TopicDeficit[],
  options: { chunkSize: number; chunksPerTopic: number }
): TopicExpansionQueueJob[] {
  if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1) {
    throw new Error(
      "Topic expansion queue chunk size must be a positive integer"
    );
  }
  if (!Number.isInteger(options.chunksPerTopic) || options.chunksPerTopic < 1) {
    throw new Error(
      "Topic expansion queue chunks per topic must be a positive integer"
    );
  }

  return deficits
    .filter((deficit) => deficit.requestedCount > 0)
    .map((deficit) => ({
      topicSlug: deficit.slug,
      requestedCount: deficit.requestedCount,
      chunks: Math.min(
        options.chunksPerTopic,
        Math.ceil(deficit.requestedCount / options.chunkSize)
      ),
    }));
}

export function createTopicExpansionWorkerCommand(input: {
  platform: NodeJS.Platform;
  topicSlug: string;
  chunks: number;
  chunkSize: number;
  json: boolean;
}): TopicExpansionWorkerCommand {
  const pnpmArgs = [
    "--filter",
    "@repo/api",
    "data:generate-topic-expansion",
    "--",
    input.topicSlug,
    "--chunks",
    String(input.chunks),
    "--chunk-size",
    String(input.chunkSize),
    ...(input.json ? ["--json"] : []),
  ];

  if (input.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm.cmd", ...pnpmArgs],
    };
  }

  return {
    command: "pnpm",
    args: pnpmArgs,
  };
}

const createPnpmWorkerCommand = (
  platform: NodeJS.Platform,
  args: string[]
): TopicExpansionWorkerCommand => {
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm.cmd", ...args],
    };
  }

  return { command: "pnpm", args };
};

export function createTopicCandidateGenerationWorkerCommand(input: {
  platform: NodeJS.Platform;
  topicSlug: string;
  count: number;
  json: boolean;
}): TopicExpansionWorkerCommand {
  return createPnpmWorkerCommand(input.platform, [
    "--filter",
    "@repo/api",
    "data:generate-topic-candidates",
    "--",
    input.topicSlug,
    "--count",
    String(input.count),
    ...(input.json ? ["--json"] : []),
  ]);
}

export function createTopicCandidateReviewWorkerCommand(input: {
  platform: NodeJS.Platform;
  topicSlug: string;
  json: boolean;
}): TopicExpansionWorkerCommand {
  return createPnpmWorkerCommand(input.platform, [
    "--filter",
    "@repo/api",
    "data:review-topic-candidates",
    "--",
    input.topicSlug,
    "--all",
    ...(input.json ? ["--json"] : []),
  ]);
}

export function resolveTopicExpansionRequest(
  deficit: TopicDeficit,
  chunkSize: number
): TopicExpansionRequest {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("Topic expansion chunk size must be a positive integer");
  }

  const requestedWords = Math.min(deficit.requestedCount, chunkSize);
  return {
    totalMissingWords: deficit.requestedCount,
    requestedWords,
    chunkSize,
    chunked: requestedWords < deficit.requestedCount,
  };
}

export function formatTopicExpansionEvent(
  event: TopicExpansionEvent,
  json: boolean
): string {
  if (json) return JSON.stringify(event);

  const fields = Object.entries(event)
    .filter(([key, value]) => key !== "event" && value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  return `[${event.event}] ${fields.join(" ")}`;
}

export function formatTopicExpansionChunkFileName(chunkNumber: number): string {
  if (!Number.isInteger(chunkNumber) || chunkNumber < 1) {
    throw new Error("Topic expansion chunk number must be a positive integer");
  }
  return `chunk-${String(chunkNumber).padStart(3, "0")}.json`;
}

export function getNextTopicExpansionChunkNumber(fileNames: string[]): number {
  const chunkNumbers = fileNames
    .map((fileName) => /^chunk-(\d{3})\.json$/u.exec(fileName)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => Number.parseInt(value, 10));
  return Math.max(0, ...chunkNumbers) + 1;
}

export function createTopicExpansionExclusionWords(input: {
  topicSlug: string;
  catalog: VocabularyCatalogItem[];
  pendingArtifacts: TopicExpansionArtifact[];
  generatedInThisRun: VocabularyCatalogItem[];
}): TopicExpansionExclusionWord[] {
  const exclusions: TopicExpansionExclusionWord[] = [];
  const seen = new Set<string>();
  const add = (word: Partial<VocabularyCatalogItem>) => {
    const normalizedWord =
      typeof word.normalizedWord === "string" && word.normalizedWord.trim()
        ? word.normalizedWord.trim().toLowerCase()
        : typeof word.word === "string"
          ? word.word.trim().toLowerCase()
          : "";
    const pos =
      typeof word.pos === "string" ? word.pos.trim().toLowerCase() : "";
    if (!normalizedWord || !pos) return;
    const identity = `${normalizedWord}|${pos}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    exclusions.push({ word: normalizedWord, pos });
  };

  for (const word of input.catalog) {
    if ((word.topics ?? []).includes(input.topicSlug)) add(word);
  }
  for (const artifact of input.pendingArtifacts) {
    if (artifact.targetTopicSlug !== input.topicSlug) continue;
    for (const word of artifact.words) add(word);
  }
  for (const word of input.generatedInThisRun) add(word);

  return exclusions;
}

export function createTopicDeficitReport(input: {
  topics: VocabularyTopicDefinition[];
  deficits: TopicDeficit[];
  minimumWords: number;
  catalogItems: number;
}): TopicDeficitReport {
  const topicsBySlug = new Map(
    input.topics.map((topic) => [topic.slug, topic])
  );
  const groups: TopicDeficitReportGroup[] = [];
  const groupsByName = new Map<string, TopicDeficitReportGroup>();

  for (const deficit of input.deficits) {
    const topic = topicsBySlug.get(deficit.slug);
    if (!topic) {
      throw new Error(`Missing Topic definition for deficit "${deficit.slug}"`);
    }

    const groupKey = `${topic.group}\u0000${topic.groupVi}`;
    let group = groupsByName.get(groupKey);
    if (!group) {
      group = {
        group: topic.group,
        groupVi: topic.groupVi,
        topics: [],
      };
      groupsByName.set(groupKey, group);
      groups.push(group);
    }

    group.topics.push({
      ...deficit,
      title: topic.title,
      titleVi: topic.titleVi,
    });
  }

  const entries = groups.flatMap((group) => group.topics);
  if (entries.length !== input.deficits.length) {
    throw new Error("Topic deficit report failed to reconcile every deficit");
  }

  return {
    schemaVersion: 1,
    action: "vocabulary-topic-expansion-deficits",
    minimumWords: input.minimumWords,
    totalTopics: input.topics.length,
    deficientTopics: entries.length,
    emptyTopics: entries.filter((topic) => topic.existingCount === 0).length,
    requestedNewWords: entries.reduce(
      (total, topic) => total + topic.requestedCount,
      0
    ),
    catalogItems: input.catalogItems,
    groups,
    providerCalled: false,
    databaseUpdated: false,
  };
}

export function formatTopicDeficitReport(
  report: TopicDeficitReport,
  reportPath: string
): string {
  const lines = [
    "Vocabulary Topic Expansion Deficits",
    "",
    `Report path      : ${reportPath}`,
    `Catalog items    : ${formatNumber(report.catalogItems)}`,
    `Minimum words    : ${formatNumber(report.minimumWords)}`,
    `Total topics     : ${formatNumber(report.totalTopics)}`,
    `Deficient topics : ${formatNumber(report.deficientTopics)}`,
    `Empty topics     : ${formatNumber(report.emptyTopics)}`,
    `Requested words  : ${formatNumber(report.requestedNewWords)}`,
    `Provider called  : ${report.providerCalled ? "yes" : "no"}`,
    `Database updated : ${report.databaseUpdated ? "yes" : "no"}`,
  ];

  for (const group of report.groups) {
    lines.push("", `${group.group} / ${group.groupVi}`);
    const slugWidth = Math.max(
      "topic".length,
      ...group.topics.map((topic) => topic.slug.length)
    );
    lines.push(
      `${"topic".padEnd(slugWidth)}  existing  missing  title / titleVi`
    );
    for (const topic of group.topics) {
      lines.push(
        `${topic.slug.padEnd(slugWidth)}  ${String(
          topic.existingCount
        ).padStart(
          8
        )}  ${String(topic.requestedCount).padStart(7)}  ${topic.title} / ${
          topic.titleVi
        }`
      );
    }
  }

  return lines.join("\n");
}

export function formatGenerationStart(
  topic: VocabularyTopicDefinition,
  requestedCount: number
): string {
  return [
    `Generating ${requestedCount} words for ${topic.slug}`,
    `Topic: ${topic.title} / ${topic.titleVi}`,
    "Database updated: no",
  ].join("\n");
}

export function formatGenerationCreated(
  topic: VocabularyTopicDefinition,
  generatedWords: number,
  outputPath: string
): string {
  return [
    `Created review artifact for ${topic.slug}`,
    `Topic: ${topic.title} / ${topic.titleVi}`,
    `Generated words: ${generatedWords}`,
    `Output path: ${outputPath}`,
    "Database updated: no",
  ].join("\n");
}

const formatNumber = (value: number) => value.toLocaleString("en-US");

const parsePositiveIntegerFlag = (flag: string, value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== value) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
};
