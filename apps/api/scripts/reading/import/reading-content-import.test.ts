import assert from "node:assert/strict";
import test from "node:test";

import type { ReadingContentPassage } from "../content/reading-content.js";
import {
  importReadingContent,
  type ReadingImportStore,
  type ReadingImportWriter,
} from "./reading-content-import.js";

type StoredPassage = {
  id: number;
  status: "DRAFT" | "PUBLISHED";
  passage: ReadingContentPassage;
  topicId: number;
};

const question = (index: number) => ({
  prompt: `Question ${index}`,
  options: [
    { text: `Correct ${index}`, correct: true },
    { text: `Wrong ${index}A`, correct: false },
    { text: `Wrong ${index}B`, correct: false },
  ],
});

const passage = (
  slug: string,
  topicSlug = "family"
): ReadingContentPassage => ({
  slug,
  title: `Title for ${slug}`,
  cefrLevel: "A1",
  topicSlug,
  estimatedMinutes: 3,
  body: Array.from({ length: 80 }, () => "word").join(" "),
  questions: [question(1), question(2), question(3), question(4)],
});

class FakeReadingStore implements ReadingImportStore {
  readonly topicIds = new Map([
    ["family", 10],
    ["home", 20],
  ]);
  records = new Map<string, StoredPassage>();
  transactionCount = 0;
  failOnSlug: string | null = null;

  async resolveTopics(slugs: string[]) {
    return new Map(
      slugs.flatMap((slug) => {
        const id = this.topicIds.get(slug);
        return id === undefined ? [] : [[slug, id] as const];
      })
    );
  }

  async transaction<T>(
    work: (writer: ReadingImportWriter) => Promise<T>
  ): Promise<T> {
    this.transactionCount += 1;
    const before = new Map(
      [...this.records].map(([slug, record]) => [slug, structuredClone(record)])
    );
    const writer: ReadingImportWriter = {
      findPassage: async (slug) => {
        const record = this.records.get(slug);
        return record ? { id: record.id, status: record.status } : null;
      },
      createDraft: async (content, topicId) => {
        if (content.slug === this.failOnSlug) {
          throw new Error(`Write failed for ${content.slug}`);
        }
        this.records.set(content.slug, {
          id: this.records.size + 1,
          status: "DRAFT",
          passage: structuredClone(content),
          topicId,
        });
      },
      replaceDraft: async (id, content, topicId) => {
        if (content.slug === this.failOnSlug) {
          throw new Error(`Write failed for ${content.slug}`);
        }
        this.records.set(content.slug, {
          id,
          status: "DRAFT",
          passage: structuredClone(content),
          topicId,
        });
      },
    };

    try {
      return await work(writer);
    } catch (error) {
      this.records = before;
      throw error;
    }
  }
}

test("creates new drafts, replaces drafts, and skips published passages", async () => {
  const store = new FakeReadingStore();
  const draft = passage("draft-passage");
  const published = passage("published-passage");
  store.records.set(draft.slug, {
    id: 1,
    status: "DRAFT",
    passage: { ...draft, title: "Old draft" },
    topicId: 10,
  });
  const publishedBefore: StoredPassage = {
    id: 2,
    status: "PUBLISHED",
    passage: published,
    topicId: 10,
  };
  store.records.set(published.slug, publishedBefore);

  const summary = await importReadingContent(
    [passage("new-passage"), draft, published],
    store
  );

  assert.deepEqual(summary, {
    created: ["new-passage"],
    updated: ["draft-passage"],
    skipped: ["published-passage"],
  });
  assert.equal(store.records.size, 3);
  assert.equal(store.records.get("draft-passage")!.passage.title, draft.title);
  assert.equal(store.records.get("published-passage"), publishedBefore);
});

test("resolves every topic before starting the transaction", async () => {
  const store = new FakeReadingStore();

  await assert.rejects(
    () =>
      importReadingContent(
        [passage("valid-passage"), passage("invalid-passage", "missing")],
        store
      ),
    /Missing Reading Topics: missing/u
  );

  assert.equal(store.transactionCount, 0);
  assert.equal(store.records.size, 0);
});

test("preserves canonical question and option order at the writer boundary", async () => {
  const store = new FakeReadingStore();
  const content = passage("ordered-passage");
  content.questions[0]!.prompt = "First reviewed question";
  content.questions[0]!.options[0]!.text = "First reviewed option";

  await importReadingContent([content], store);

  const stored = store.records.get(content.slug)!.passage;
  assert.equal(stored.questions[0]!.prompt, "First reviewed question");
  assert.equal(stored.questions[0]!.options[0]!.text, "First reviewed option");
  assert.deepEqual(
    stored.questions.map(({ prompt }) => prompt),
    content.questions.map(({ prompt }) => prompt)
  );
});

test("rolls back the whole pack when any write fails", async () => {
  const store = new FakeReadingStore();
  const original = passage("original-passage");
  store.records.set(original.slug, {
    id: 1,
    status: "DRAFT",
    passage: original,
    topicId: 10,
  });
  const before = structuredClone([...store.records]);
  store.failOnSlug = "broken-passage";

  await assert.rejects(
    () =>
      importReadingContent(
        [passage("new-passage"), passage("broken-passage")],
        store
      ),
    /Write failed for broken-passage/u
  );

  assert.deepEqual([...store.records], before);
});

test("a repeated import never creates a duplicate slug", async () => {
  const store = new FakeReadingStore();
  const content = passage("repeatable-passage");

  const first = await importReadingContent([content], store);
  const second = await importReadingContent([content], store);

  assert.deepEqual(first, {
    created: ["repeatable-passage"],
    updated: [],
    skipped: [],
  });
  assert.deepEqual(second, {
    created: [],
    updated: ["repeatable-passage"],
    skipped: [],
  });
  assert.equal(store.records.size, 1);
});

test("returns deterministic sorted summary arrays", async () => {
  const store = new FakeReadingStore();

  const summary = await importReadingContent(
    [passage("z-passage"), passage("a-passage")],
    store
  );

  assert.deepEqual(summary.created, ["a-passage", "z-passage"]);
});
