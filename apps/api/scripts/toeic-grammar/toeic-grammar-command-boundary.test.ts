import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { parseToeicGrammarOptions } from "./toeic-grammar.cli.js";

test("rejects credentials on the command line and validates bounded options", () => {
  assert.throws(() => parseToeicGrammarOptions(["--authorization=secret"]), /not accepted/iu);
  assert.throws(() => parseToeicGrammarOptions(["--access-token=secret"]), /not accepted/iu);
  assert.throws(() => parseToeicGrammarOptions(["--workers=9"]), /between 1 and 8/iu);
  assert.throws(() => parseToeicGrammarOptions(["--approved-sha=abc"]), /SHA-256/iu);
  assert.deepEqual(parseToeicGrammarOptions(["--", "--workers=4"]), { workers: 4, approvedSha256: undefined });
});

test("only the import entrypoint references Prisma", async () => {
  const root = resolve(__dirname);
  for (const name of ["inventory-toeic-grammar.ts", "download-toeic-grammar.ts", "validate-toeic-grammar.ts"]) {
    const source = await readFile(resolve(root, name), "utf8");
    assert.doesNotMatch(source, /script-prisma|PrismaClient/u);
  }
  const importer = await readFile(resolve(root, "import-toeic-grammar.ts"), "utf8");
  assert.match(importer, /script-prisma/u);
});
