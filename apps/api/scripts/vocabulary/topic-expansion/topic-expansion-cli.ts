import type { TopicDeficit } from "./topic-expansion.js";
import type { VocabularyTopicDefinition } from "../catalog/vocabulary-catalog.js";

export type TopicExpansionArguments = {
  json: boolean;
  topicSlug: string | null;
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

export function parseTopicExpansionArguments(
  args: string[]
): TopicExpansionArguments {
  let json = false;
  const topicSlugs: string[] = [];

  for (const argument of args) {
    if (argument === "--") continue;
    if (argument === "--json") {
      json = true;
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

  return { json, topicSlug: topicSlugs[0] ?? null };
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
