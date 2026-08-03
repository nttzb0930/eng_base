import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicToeicWritingSource } from "./dautoeic-toeic-writing-source.js";

const config = (request: typeof fetch) => ({
  baseUrl: "https://source.example.com",
  apiKey: "public-key",
  accessToken: "user-token",
  allowedHosts: ["source.example.com"],
  request,
  timeoutMs: 1_000,
  maxRetries: 0,
});

test("source fails closed on an authorization response", async () => {
  const source = createDautoeicToeicWritingSource(
    config(async () => new Response(null, { status: 401 })) as never
  );

  await assert.rejects(
    () => source.listPartOneTasks(),
    /authorization failed \(401\)/iu
  );
});

test("source requests only visible published Part 1 rows", async () => {
  let requestedUrl = "";
  const source = createDautoeicToeicWritingSource(
    config(async (input) => {
      requestedUrl = String(input);
      return Response.json([]);
    }) as never
  );

  await source.listPartOneTasks();

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/rest/v1/writing_part1_questions");
  assert.equal(url.searchParams.get("status"), "eq.published");
  assert.equal(url.searchParams.get("is_hidden"), "eq.false");
});
