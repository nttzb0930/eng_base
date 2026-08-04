import type { ReadingContentPassage } from "../content/reading-content.js";

export type ReadingImportSummary = {
  created: string[];
  updated: string[];
  skipped: string[];
};

export interface ReadingImportStore {
  resolveTopics(slugs: string[]): Promise<Map<string, number>>;
  transaction<T>(work: (writer: ReadingImportWriter) => Promise<T>): Promise<T>;
}

export interface ReadingImportWriter {
  findPassage(
    slug: string
  ): Promise<{ id: number; status: "DRAFT" | "PUBLISHED" } | null>;
  createDraft(passage: ReadingContentPassage, topicId: number): Promise<void>;
  replaceDraft(
    id: number,
    passage: ReadingContentPassage,
    topicId: number
  ): Promise<void>;
}

export async function importReadingContent(
  passages: ReadingContentPassage[],
  store: ReadingImportStore
): Promise<ReadingImportSummary> {
  const topicSlugs = [...new Set(passages.map((passage) => passage.topicSlug))];
  const topicIds = await store.resolveTopics(topicSlugs);
  const missingTopicSlugs = topicSlugs.filter((slug) => !topicIds.has(slug));

  if (missingTopicSlugs.length > 0) {
    throw new Error(
      `Missing Reading Topics: ${missingTopicSlugs.sort().join(", ")}`
    );
  }

  return store.transaction(async (writer) => {
    const summary: ReadingImportSummary = {
      created: [],
      updated: [],
      skipped: [],
    };

    for (const passage of passages) {
      const topicId = topicIds.get(passage.topicSlug);
      if (topicId === undefined) {
        throw new Error(`Missing Reading Topic: ${passage.topicSlug}`);
      }

      const existing = await writer.findPassage(passage.slug);
      if (!existing) {
        await writer.createDraft(passage, topicId);
        summary.created.push(passage.slug);
        continue;
      }

      if (existing.status === "PUBLISHED") {
        summary.skipped.push(passage.slug);
        continue;
      }

      await writer.replaceDraft(existing.id, passage, topicId);
      summary.updated.push(passage.slug);
    }

    summary.created.sort();
    summary.updated.sort();
    summary.skipped.sort();
    return summary;
  });
}
