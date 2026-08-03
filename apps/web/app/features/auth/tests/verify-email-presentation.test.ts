import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve(process.cwd(), "app/views/auth/VerifyEmailView.tsx"),
  "utf8"
);

test("verification email and code are derived without synchronizing duplicate state", () => {
  assert.match(source, /const email = initialEmail;/);
  assert.match(source, /const code = digits\.join\(""\);/);
  assert.doesNotMatch(source, /useState\(initialEmail\)/);
  assert.doesNotMatch(source, /setCode\(digits\.join\(""\)\)/);
});
