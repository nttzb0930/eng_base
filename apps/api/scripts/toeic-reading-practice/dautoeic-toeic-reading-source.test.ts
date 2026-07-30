import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicToeicReadingSource } from "./dautoeic-toeic-reading-source.js";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("requests only the Reading index and maps public source metadata", async () => {
  const urls: URL[] = [];
  const request: typeof fetch = async (input) => {
    const url = new URL(String(input));
    urls.push(url);
    if (url.pathname.endsWith("/mock_test_sets")) {
      return json([
        { id: "set-2026", name: "2026", order_index: 1, is_hidden: false },
      ]);
    }
    if (url.pathname.endsWith("/mock_tests")) {
      return json([
        {
          id: "test-1",
          set_id: "set-2026",
          name: "Test 1",
          order_index: 1,
          is_free: true,
          is_hidden: false,
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }
    return json([
      {
        id: "question-119",
        test_id: "test-1",
        part: 5,
        question_number: 119,
        passage_id: null,
        image_url: null,
      },
    ]);
  };
  const source = createDautoeicToeicReadingSource({
    baseUrl: "https://source.example",
    authorization: "anonymous-test-key",
    allowedHosts: ["source.example"],
    request,
    timeoutMs: 1_000,
    maxRetries: 0,
    pageSize: 1_000,
  });

  assert.equal((await source.listSets())[0]?.name, "2026");
  assert.equal((await source.listTests())[0]?.free, true);
  assert.equal((await source.listQuestionIndex("test-1"))[0]?.sourceNumber, 119);

  const questionUrl = urls.find((url) =>
    url.pathname.endsWith("/mock_test_questions"),
  );
  assert.equal(questionUrl?.searchParams.get("test_id"), "eq.test-1");
  assert.equal(questionUrl?.searchParams.get("part"), "in.(5,6,7)");
  assert.match(questionUrl?.searchParams.get("select") ?? "", /question_number/u);
});

test("fails closed on authorization errors without retrying", async () => {
  let requests = 0;
  const source = createDautoeicToeicReadingSource({
    baseUrl: "https://source.example",
    authorization: "secret-value-that-must-not-leak",
    allowedHosts: ["source.example"],
    request: async () => {
      requests += 1;
      return json({ message: "denied" }, 403);
    },
    timeoutMs: 1_000,
    maxRetries: 3,
  });

  await assert.rejects(source.listSets(), (error: Error) => {
    assert.match(error.message, /authorization failed \(403\)/u);
    assert.doesNotMatch(error.message, /secret-value/u);
    return true;
  });
  assert.equal(requests, 1);
});
