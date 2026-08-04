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

function partTwoRow(titleVi: string | null) {
  return {
    id: "part-two-1",
    external_id: 1,
    title: "Printer paper jam complaint",
    title_vi: titleVi,
    difficulty: "easy",
    directions: "Read the email and write a response.",
    email: "The printer is not working.",
    email_vi: "Máy in không hoạt động.",
    requirements: [],
    outline_1: [],
    outline_2: [],
    chunks_1: [],
    chunks_2: [],
    gap_references: [],
    sample_en: "I am writing about the printer.",
    sample_vi: null,
    status: "published",
    is_hidden: false,
  };
}

test("source preserves the Vietnamese Part 2 title in the canonical payload", async () => {
  const source = createDautoeicToeicWritingSource(
    config(async () =>
      Response.json([partTwoRow("Khiếu nại máy in bị kẹt giấy")])
    ) as never
  );

  const tasks = await source.listPartTwoTasks();

  assert.equal(
    tasks[0]?.payload.titleVi,
    "Khiếu nại máy in bị kẹt giấy"
  );
});

test("source normalizes a blank Part 2 Vietnamese title to null", async () => {
  const source = createDautoeicToeicWritingSource(
    config(async () => Response.json([partTwoRow("   ")])) as never
  );

  const tasks = await source.listPartTwoTasks();

  assert.equal(tasks[0]?.payload.titleVi, null);
});
