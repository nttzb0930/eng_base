import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicDictationApi,
  toeicDictationKeys,
} from "../api/toeic-dictation.api";

test("dictation API keeps catalog filters and submit/media routes explicit", async () => {
  const paths: string[] = [];
  const http = {
    get: (path: string, config?: { responseType?: string }) => {
      paths.push(`GET ${path}${config?.responseType ? ` [${config.responseType}]` : ""}`);
      return Promise.resolve({ data: [] });
    },
    post: (path: string) => {
      paths.push(`POST ${path}`);
      return Promise.resolve({ data: {} });
    },
  };
  const api = createToeicDictationApi(http as never);
  await api.overview();
  await api.sets({ collection: "2026", test: 1, part: 3 });
  await api.set(10);
  await api.progress(10);
  await api.checkItem(20, 50);
  await api.fullItem(20);
  await api.submit(20, {} as never);
  await api.media(20);

  assert.deepEqual(paths, [
    "GET /toeic/dictation/overview",
    "GET /toeic/dictation/sets?collection=2026&test=1&part=3",
    "GET /toeic/dictation/sets/10/items",
    "GET /toeic/dictation/sets/10/progress",
    "GET /toeic/dictation/items/20/check?hide=50",
    "GET /toeic/dictation/items/20/full",
    "POST /toeic/dictation/items/20/submit",
    "GET /toeic/dictation/media/20 [blob]",
  ]);
  assert.notDeepEqual(toeicDictationKeys.sets(undefined, 1), toeicDictationKeys.sets(undefined, 2));
});
