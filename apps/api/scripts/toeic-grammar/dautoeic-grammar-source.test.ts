import assert from "node:assert/strict";
import test from "node:test";

import { createDautoeicGrammarSource } from "./dautoeic-grammar-source.js";

const apiKey = "public-anon-key";
const accessToken = "user-access-token";

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function questionRow() {
  return {
    question_id: "q-1",
    topic_id: "topic-1",
    subtopic_id: "subtopic-1",
    question_number: 1,
    question_text: "The ideal temperature is ------- 10 and 30 degrees.",
    option_a: "between",
    option_b: "above",
    option_c: "in",
    option_d: "off",
    correct_answer: "A",
    explanation_vi: "Between ... and ...",
    explanation_en: null,
    dich_nghia: "Nhiệt độ lý tưởng nằm từ 10 đến 30 độ.",
    dich_nghia_dap_an: null,
    tu_vung: [],
    prefer_ai_explanation: false,
  };
}

test("separates anonymous catalog authorization from protected requests", async () => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, headers: new Headers(init?.headers) });
    if (url.includes("grammar_topics")) {
      return response([
        {
          id: "topic-1",
          title_en: "Prepositions",
          title_vi: "Giới từ",
          description_vi: null,
          order_index: 1,
          icon: null,
        },
      ]);
    }
    if (url.includes("grammar_subtopics")) {
      return response([
        {
          id: "subtopic-1",
          topic_id: "topic-1",
          title_en: "Between and among",
          title_vi: "Between và among",
          description_vi: null,
          access_level: "free",
          order_index: 1,
        },
      ]);
    }
    return response([questionRow()]);
  };
  const source = createDautoeicGrammarSource({
    baseUrl: "https://project.supabase.co",
    apiKey: `Bearer ${apiKey}`,
    accessToken: `Bearer ${accessToken}`,
    allowedHosts: ["project.supabase.co"],
    request,
    timeoutMs: 1_000,
    maxRetries: 0,
  });

  await source.readCatalog();
  await source.readDifficultyQuestions(1);

  assert.equal(calls[0]?.headers.get("apikey"), apiKey);
  assert.equal(calls[0]?.headers.get("authorization"), `Bearer ${apiKey}`);
  assert.equal(calls[2]?.headers.get("apikey"), apiKey);
  assert.equal(
    calls[2]?.headers.get("authorization"),
    `Bearer ${accessToken}`
  );
});

test("maps mixed sets and rich question fields", async () => {
  const request: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("get_grammar_bank_sets")) {
      return response([
        {
          set_id: "set-1",
          set_name: "Grammar 2026",
          year: 2026,
          access_level: "free",
        },
      ]);
    }
    return response([questionRow()]);
  };
  const source = createDautoeicGrammarSource({
    baseUrl: "https://project.supabase.co",
    apiKey,
    accessToken,
    allowedHosts: ["project.supabase.co"],
    request,
    timeoutMs: 1_000,
    maxRetries: 0,
  });

  assert.deepEqual(await source.readSets(), [
    {
      sourceSetId: "set-1",
      name: "Grammar 2026",
      year: 2026,
      accessLevel: "free",
    },
  ]);
  const questions = await source.readSetQuestions("set-1");
  assert.equal(questions[0]?.options[0]?.text, "between");
  assert.equal(questions[0]?.options[0]?.correct, true);
  assert.equal(
    questions[0]?.questionTranslation,
    "Nhiệt độ lý tưởng nằm từ 10 đến 30 độ."
  );
});

test("rejects disallowed URLs and malformed responses", async () => {
  assert.throws(
    () =>
      createDautoeicGrammarSource({
        baseUrl: "http://project.supabase.co",
        apiKey,
        accessToken,
        allowedHosts: ["project.supabase.co"],
        request: fetch,
        timeoutMs: 1_000,
        maxRetries: 0,
      }),
    /not allowed/iu
  );

  const source = createDautoeicGrammarSource({
    baseUrl: "https://project.supabase.co",
    apiKey,
    accessToken,
    allowedHosts: ["project.supabase.co"],
    request: async () => response({ not: "an array" }),
    timeoutMs: 1_000,
    maxRetries: 0,
  });
  await assert.rejects(source.readSets(), /array/iu);
});

test("categorizes authorization failures without credential leakage", async () => {
  const source = createDautoeicGrammarSource({
    baseUrl: "https://project.supabase.co",
    apiKey,
    accessToken,
    allowedHosts: ["project.supabase.co"],
    request: async () => response({}, 401),
    timeoutMs: 1_000,
    maxRetries: 0,
  });
  await assert.rejects(source.readDifficultyQuestions(1), (error: Error) => {
    assert.equal(error.name, "GrammarSourceAuthorizationError");
    assert.doesNotMatch(error.message, new RegExp(accessToken, "u"));
    return true;
  });
});
