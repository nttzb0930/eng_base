import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicVocabularyCacheSource } from "./toeic-vocabulary-cache.source.js";

test("reads only ready vocabulary and normalizes an existing Bearer prefix", async () => {
  const requests: Array<{ url: string; authorization: string | null }> = [];
  const source = createDautoeicVocabularyCacheSource({
    baseUrl: "https://source.example",
    apiKey: "anon-key",
    accessToken: "Bearer user-token",
    allowedHosts: ["source.example"],
    timeoutMs: 1_000,
    maxRetries: 0,
    request: async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        authorization: headers.get("authorization"),
      });
      return Response.json([
        {
          question_id: "question-1",
          status: "ready",
          vocabulary: [{ word: "lift", meaning_vi: "nâng lên" }],
        },
      ]);
    },
  });

  const rows = await source.readReady(["question-1", "question-2"]);

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.authorization, "Bearer user-token");
  assert.match(requests[0]?.url ?? "", /status=eq\.ready/u);
  assert.deepEqual(rows, [
    {
      questionId: "question-1",
      vocabulary: [{ word: "lift", meaning_vi: "nâng lên" }],
    },
  ]);
});

test("retries retryable source failures without calling another endpoint", async () => {
  const urls: string[] = [];
  const source = createDautoeicVocabularyCacheSource({
    baseUrl: "https://source.example",
    apiKey: "anon-key",
    accessToken: "user-token",
    allowedHosts: ["source.example"],
    timeoutMs: 1_000,
    maxRetries: 1,
    sleep: async () => undefined,
    request: async (input) => {
      urls.push(String(input));
      return urls.length === 1
        ? new Response(null, { status: 429 })
        : Response.json([]);
    },
  });

  assert.deepEqual(await source.readReady(["question-1"]), []);
  assert.equal(urls.length, 2);
  assert.ok(
    urls.every((url) => url.includes("/rest/v1/mock_test_question_vocabulary"))
  );
});

test("retries a transient network failure", async () => {
  let attempts = 0;
  const source = createDautoeicVocabularyCacheSource({
    baseUrl: "https://source.example",
    apiKey: "anon-key",
    accessToken: "user-token",
    allowedHosts: ["source.example"],
    timeoutMs: 1_000,
    maxRetries: 1,
    sleep: async () => undefined,
    request: async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("fetch failed");
      return Response.json([]);
    },
  });

  assert.deepEqual(await source.readReady(["question-1"]), []);
  assert.equal(attempts, 2);
});
