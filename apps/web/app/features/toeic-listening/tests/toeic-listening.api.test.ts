import assert from "node:assert/strict";
import test from "node:test";
import {
  createToeicListeningApi,
  toeicListeningKeys,
} from "../api/toeic-listening.api";
test("Listening resource keeps Full and Part cache and request identities separate", async () => {
  const paths: string[] = [];
  const http = {
    get: (path: string, config?: { responseType?: string }) => {
      paths.push(
        `GET ${path}${config?.responseType ? ` [${config.responseType}]` : ""}`
      );
      return Promise.resolve({ data: [] });
    },
    post: (path: string) => {
      paths.push(`POST ${path}`);
      return Promise.resolve({ data: {} });
    },
    put: (path: string) => {
      paths.push(`PUT ${path}`);
      return Promise.resolve({ data: {} });
    },
    delete: (path: string) => {
      paths.push(`DELETE ${path}`);
      return Promise.resolve({ data: {} });
    },
  };
  const api = createToeicListeningApi(http as never);
  await api.tests();
  await api.tests(3);
  await api.test(7, 2);
  await api.checkAnswer(7, {} as never);
  await api.draft(7, 2);
  await api.saveDraft(7, {} as never);
  await api.deleteDraft(7, 2);
  await api.submit({} as never);
  await api.attempts(4);
  await api.attempt(9);
  await api.media(77);
  assert.deepEqual(paths, [
    "GET /toeic/listening/tests",
    "GET /toeic/listening/tests?part=3",
    "GET /toeic/listening/tests/7?part=2",
    "POST /toeic/listening/tests/7/check-answer",
    "GET /toeic/listening/tests/7/draft?part=2",
    "PUT /toeic/listening/tests/7/draft",
    "DELETE /toeic/listening/tests/7/draft?part=2",
    "POST /toeic/listening/attempts",
    "GET /toeic/listening/attempts?part=4",
    "GET /toeic/listening/attempts/9",
    "GET /toeic/listening/media/77 [blob]",
  ]);
  assert.notDeepEqual(toeicListeningKeys.tests(), toeicListeningKeys.tests(1));
  assert.notDeepEqual(
    toeicListeningKeys.draft(7),
    toeicListeningKeys.draft(7, 1)
  );
});
