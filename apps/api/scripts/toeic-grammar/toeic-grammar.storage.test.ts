import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFileToeicGrammarStorage } from "./toeic-grammar.storage.js";

test("uses the private licensed-content root and writes inventories atomically", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "grammar-storage-"));
  const storage = createFileToeicGrammarStorage({ repositoryRoot });
  const sha = "a".repeat(64);
  const key = await storage.writeInventory({ inventorySha256: sha });

  assert.equal(key, `inventories/toeic-grammar/${sha}.json`);
  assert.deepEqual(await storage.readInventory(sha), { inventorySha256: sha });
  const names = await readdir(
    join(storage.root, "inventories", "toeic-grammar")
  );
  assert.deepEqual(names, [`${sha}.json`]);
});

test("rejects broad and non-private storage roots", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "grammar-storage-"));
  for (const configuredRoot of [
    repositoryRoot,
    join(repositoryRoot, "outside-private"),
  ]) {
    assert.throws(
      () => createFileToeicGrammarStorage({ repositoryRoot, configuredRoot }),
      /unsafe TOEIC Grammar storage root/iu
    );
  }
});
