import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const messages = (locale: "en" | "vi") =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `app/messages/${locale}.json`), "utf8")
  ) as Record<string, unknown>;

test("TOEIC Grammar learner copy exists in both supported locales", () => {
  for (const locale of ["en", "vi"] as const) {
    const namespace = messages(locale).toeicGrammar as
      | Record<string, unknown>
      | undefined;
    assert.ok(namespace, `${locale} must define toeicGrammar`);
    assert.ok(namespace.catalog, `${locale} must define catalog copy`);
    assert.ok(namespace.practice, `${locale} must define practice copy`);
    assert.ok(namespace.feedback, `${locale} must define feedback copy`);
  }
});
