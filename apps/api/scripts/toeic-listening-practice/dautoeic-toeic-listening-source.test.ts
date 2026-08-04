import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicToeicListeningSource } from "./dautoeic-toeic-listening-source";

function response(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  }) as Response & { url: string };
}

test("source maps only Listening question and stimulus index fields", async () => {
  const urls: URL[] = [];
  const source = createDautoeicToeicListeningSource({
    baseUrl: "https://api.example",
    authorization: "private",
    allowedHosts: ["api.example", "media.example"],
    timeoutMs: 1_000,
    maxRetries: 0,
    request: async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      if (url.pathname.endsWith("/mock_tests")) {
        return response([
          {
            id: "test-1",
            set_id: "set-1",
            name: "Test 1",
            order_index: 1,
            media_folder: "2026/Test 1",
            media_version: "2",
          },
        ]);
      }
      if (url.pathname.endsWith("/mock_test_questions")) {
        return response([
          {
            id: "q-1",
            test_id: "test-1",
            part: 1,
            question_number: 1,
            passage_id: null,
            audio_url: "audio/q-1.mp3",
            image_url: "https://media.example/q-1.jpg",
          },
        ]);
      }
      return response([
        {
          id: "stimulus-1",
          test_id: "test-1",
          part: 3,
          audio_url: "https://media.example/stimulus-1.mp3",
          image_url: null,
        },
      ]);
    },
  });

  assert.equal((await source.listTests())[0]?.sourceTestId, "test-1");
  const question = (await source.listQuestionIndex("test-1"))[0];
  assert.equal(question?.part, 1);
  assert.equal(
    question?.audioUrl,
    "https://api.example/storage/v1/object/public/mock-test-media/2026/Test%201/audio/q-1.mp3?v=2"
  );
  assert.equal(
    (await source.listStimulusIndex("test-1"))[0]?.sourceStimulusId,
    "stimulus-1"
  );
  assert.equal(
    urls
      .find((url) => url.pathname.endsWith("/mock_test_questions"))
      ?.searchParams.get("part"),
    "in.(1,2,3,4)"
  );
});

test("source media inspection uses HEAD and rejects non-allowlisted URLs", async () => {
  let method = "";
  const source = createDautoeicToeicListeningSource({
    baseUrl: "https://api.example",
    authorization: "private",
    allowedHosts: ["api.example", "media.example"],
    timeoutMs: 1_000,
    maxRetries: 0,
    request: async (_input, init) => {
      method = init?.method ?? "GET";
      return new Response(null, {
        status: 200,
        headers: {
          "content-length": "1234",
          "content-type": "audio/mpeg",
        },
      });
    },
  });

  assert.deepEqual(
    await source.inspectMedia("https://media.example/audio.mp3"),
    {
      url: "https://media.example/audio.mp3",
      bytes: 1234,
      contentType: "audio/mpeg",
    }
  );
  assert.equal(method, "HEAD");
  await assert.rejects(
    () => source.inspectMedia("https://evil.example/audio.mp3"),
    /not allowed/u
  );
});
