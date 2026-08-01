import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicToeicDictationSource } from "./dautoeic-toeic-dictation-source";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("dictation source parses set and item fields without returning provider-only fields", async () => {
  const requests: URL[] = [];
  const source = createDautoeicToeicDictationSource({
    baseUrl: "https://api.example",
    authorization: "private",
    allowedHosts: ["api.example", "media.example"],
    timeoutMs: 1_000,
    maxRetries: 0,
    request: async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname.endsWith("/listening_sets")) {
        return jsonResponse([
          {
            id: "set-1",
            name: "TEST 1 2026",
            folder_path: "2026/test-1/part-1",
            toeic_part: "part1",
            access_level: "free",
            order_index: 0,
            collection_name: "Đề 2026",
            chapter_name: null,
            subtitle: null,
            is_hidden: false,
            source_internal_note: "must not escape",
          },
        ]);
      }
      if (url.pathname.endsWith("/listening_items")) {
        return jsonResponse([
          {
            id: "item-1",
            set_id: "set-1",
            order_index: 0,
            group_id: "group-1",
            group_order: 0,
            audio_url: "https://media.example/audio/item-1.mp3",
            transcript: "She opens the door.",
            translation_vi: "Cô ấy mở cửa.",
            duration_seconds: 4,
            is_hidden: false,
            internal_answer_key: "private",
          },
        ]);
      }
      throw new Error(`unexpected path: ${url.pathname}`);
    },
  });

  const sets = await source.listSets("Đề 2026");
  const items = await source.listItems("set-1");

  assert.deepEqual(sets[0], {
    sourceSetId: "set-1",
    name: "TEST 1 2026",
    folderPath: "2026/test-1/part-1",
    part: 1,
    accessLevel: "free",
    order: 0,
    collectionName: "Đề 2026",
    chapterName: null,
    subtitle: null,
    isHidden: false,
  });
  assert.deepEqual(items[0], {
    sourceItemId: "item-1",
    sourceSetId: "set-1",
    order: 0,
    groupId: "group-1",
    groupOrder: 0,
    audioUrl: "https://media.example/audio/item-1.mp3",
    transcript: "She opens the door.",
    translationVi: "Cô ấy mở cửa.",
    durationSeconds: 4,
    isHidden: false,
  });
  assert.equal(requests[0]?.searchParams.get("collection_name"), "eq.Đề 2026");
  assert.equal(requests[0]?.searchParams.get("is_hidden"), "eq.false");
});

test("dictation source rejects non-allowlisted media and source auth failures", async () => {
  const source = createDautoeicToeicDictationSource({
    baseUrl: "https://api.example",
    authorization: "private",
    allowedHosts: ["api.example", "media.example"],
    timeoutMs: 1_000,
    maxRetries: 0,
    request: async () => jsonResponse([], 401),
  });

  await assert.rejects(
    () => source.listSets("Đề 2026"),
    /authorization failed \(401\)/u
  );
  await assert.rejects(
    () => source.inspectMedia("https://evil.example/audio.mp3"),
    /not allowed/u
  );
});
