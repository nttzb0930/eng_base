import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpClient,
  HttpClientError,
  unwrap,
} from "../src/lib/http-client";

test("admin HTTP interface unwraps a successful API envelope", () => {
  assert.deepEqual(unwrap({ success: true, data: { id: 7 } }), { id: 7 });
});

test("admin HTTP interface rejects an unsuccessful API envelope", () => {
  assert.throws(
    () => unwrap({ success: false, message: "Unauthorized" }),
    (error) =>
      error instanceof HttpClientError &&
      error.status === 500 &&
      error.message === "Unauthorized",
  );
});

test("admin HTTP client normalizes URL, auth, query and JSON body", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: { url: string; init?: RequestInit } | undefined;

  globalThis.fetch = async (input, init) => {
    capturedRequest = { url: String(input), init };
    return new Response(JSON.stringify({ id: 9 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const client = createHttpClient({
    baseUrl: "https://api.example.test/v1",
    getAccessToken: () => "admin-token",
  });
  const response = await client.post(
    "/courses",
    { title: "English" },
    { params: { page: 2, empty: "", missing: undefined } },
  );

  assert.deepEqual(response, { success: true, data: { id: 9 } });
  assert.equal(capturedRequest?.url, "https://api.example.test/v1/courses?page=2");
  assert.equal(capturedRequest?.init?.method, "POST");
  assert.equal(
    (capturedRequest?.init?.headers as Record<string, string>).Authorization,
    "Bearer admin-token",
  );
  assert.equal(capturedRequest?.init?.body, JSON.stringify({ title: "English" }));
});
