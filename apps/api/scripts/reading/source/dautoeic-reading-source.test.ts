import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicReadingSource } from "./dautoeic-reading-source.js";

function sourceRow(id: string, order: number) {
  return {
    id,
    title: `Synthetic ${id}`,
    topic: "",
    level: order % 2 === 0 ? 2 : 1,
    order_index: order,
    content_html: `<p>Passage ${id}</p>`,
    questions_json: [
      {
        question: `Question ${id}?`,
        choices: [
          { label: "A", text: "First" },
          { label: "B", text: "Second" },
        ],
        correct: "A",
        explanation: "",
        translation: "",
      },
    ],
    vocabulary_json: [],
    is_free: true,
    is_hidden: false,
    updated_at: "2026-07-31T00:00:00.000Z",
  };
}

function createQueuedFetch(responses: Response[]) {
  const requests: Array<{ url: string; headers: Headers }> = [];
  const request = async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    requests.push({ url, headers: new Headers(init?.headers) });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected request");
    return response;
  };
  return { request: request as typeof fetch, requests };
}

function sourceWith(request: typeof fetch) {
  return createDautoeicReadingSource({
    baseUrl: "https://source.example",
    authorization: "public-test-credential",
    allowedHosts: ["source.example", "media.example"],
    request,
    timeoutMs: 1_000,
    maxRetries: 0,
    pageSize: 2,
    sleep: async () => undefined,
  });
}

test("lists access metadata without requesting Reading content", async () => {
  const fetchQueue = createQueuedFetch([
    Response.json([
      { id: "reading-1", level: 1, is_free: true, is_hidden: false },
      { id: "reading-2", level: 2, is_free: false, is_hidden: false },
    ]),
    Response.json([]),
  ]);

  const summaries = await sourceWith(fetchQueue.request).listAccessSummaries();

  assert.deepEqual(summaries, [
    {
      sourceId: "reading-1",
      sourceLevel: "1",
      isFree: true,
      isHidden: false,
    },
    {
      sourceId: "reading-2",
      sourceLevel: "2",
      isFree: false,
      isHidden: false,
    },
  ]);
  const firstUrl = new URL(fetchQueue.requests[0].url);
  assert.equal(firstUrl.searchParams.get("select"), "id,level,is_free,is_hidden");
  assert.equal(firstUrl.searchParams.has("content_html"), false);
  assert.equal(fetchQueue.requests[0].headers.get("apikey"), "public-test-credential");
});

test("paginates visible free Reading content with fixed filters and order", async () => {
  const fetchQueue = createQueuedFetch([
    Response.json([sourceRow("reading-1", 1), sourceRow("reading-2", 2)]),
    Response.json([sourceRow("reading-3", 3)]),
  ]);

  const rows = await sourceWith(fetchQueue.request).listReadingRows();

  assert.deepEqual(
    rows.map((row) => row.sourceId),
    ["reading-1", "reading-2", "reading-3"],
  );
  const firstUrl = new URL(fetchQueue.requests[0].url);
  assert.equal(firstUrl.searchParams.get("is_free"), "eq.true");
  assert.equal(firstUrl.searchParams.get("is_hidden"), "eq.false");
  assert.equal(firstUrl.searchParams.get("order"), "order_index.asc,id.asc");
  assert.match(firstUrl.searchParams.get("select") ?? "", /questions_json/u);
  assert.equal(new URL(fetchQueue.requests[1].url).searchParams.get("offset"), "2");
});

test("does not retry authorization failures or expose response content", async () => {
  const fetchQueue = createQueuedFetch([
    new Response("secret answer and passage", { status: 403 }),
  ]);

  await assert.rejects(
    sourceWith(fetchQueue.request).listReadingRows(),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.match((error as Error).message, /authorization failed \(403\)/u);
      assert.doesNotMatch(
        (error as Error).message,
        /secret|answer|passage|public-test-credential/u,
      );
      return true;
    },
  );
  assert.equal(fetchQueue.requests.length, 1);
});

test("retries 429 responses and honors the configured retry boundary", async () => {
  const fetchQueue = createQueuedFetch([
    new Response(null, { status: 429, headers: { "retry-after": "0" } }),
    Response.json([]),
  ]);
  const source = createDautoeicReadingSource({
    baseUrl: "https://source.example",
    authorization: "public-test-credential",
    allowedHosts: ["source.example"],
    request: fetchQueue.request,
    timeoutMs: 1_000,
    maxRetries: 1,
    pageSize: 2,
    sleep: async () => undefined,
  });

  assert.deepEqual(await source.listReadingRows(), []);
  assert.equal(fetchQueue.requests.length, 2);
});

test("rejects source shape drift with field paths only", async () => {
  const fetchQueue = createQueuedFetch([
    Response.json([{ ...sourceRow("reading-1", 1), correct_answer: "A" }]),
  ]);

  await assert.rejects(
    sourceWith(fetchQueue.request).listReadingRows(),
    /correct_answer/u,
  );
});

test("allows only HTTPS media hosts from the explicit allowlist", async () => {
  const fetchQueue = createQueuedFetch([
    new Response(null, {
      status: 200,
      headers: { "content-length": "123", "content-type": "image/png" },
    }),
  ]);
  const source = sourceWith(fetchQueue.request);

  assert.deepEqual(
    await source.inspectEmbeddedImage("https://media.example/image.png"),
    {
      url: "https://media.example/image.png",
      bytes: 123,
      mimeType: "image/png",
    },
  );
  await assert.rejects(
    source.inspectEmbeddedImage("http://media.example/image.png"),
    /HTTPS/u,
  );
  await assert.rejects(
    source.inspectEmbeddedImage("https://other.example/image.png"),
    /allowlist/u,
  );
});
