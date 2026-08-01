import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { z } from "zod";

import type { ToeicVocabularyItem } from "./toeic-vocabulary-cache.types.js";

const checkpointSchema = z.object({
  schemaVersion: z.literal(1),
  scopeSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  completed: z.boolean(),
  queriedQuestionIds: z.array(z.string().min(1)),
  entries: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type ToeicVocabularyCheckpoint = z.infer<typeof checkpointSchema>;

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createToeicVocabularyCacheStorage(repositoryRoot: string) {
  const root = resolve(repositoryRoot, "var", "licensed-content", "dautoeic");
  const checkpointPath = (scopeSha256: string) =>
    join(root, "toeic-vocabulary-cache", `${scopeSha256}.checkpoint.json`);

  return {
    root,

    async latestReadingInventorySha256() {
      const directory = join(root, "inventories", "toeic-reading-practice");
      const candidates = await Promise.all(
        (await readdir(directory))
          .filter((name) => /^[a-f0-9]{64}\.json$/u.test(name))
          .map(async (name) => ({
            name,
            modifiedAt: (await stat(join(directory, name))).mtimeMs,
          }))
      );
      const latest = candidates.sort(
        (left, right) => right.modifiedAt - left.modifiedAt
      )[0];
      if (!latest) throw new Error("No TOEIC Reading inventory is available");
      return latest.name.slice(0, -".json".length);
    },

    async readCheckpoint(scopeSha256: string) {
      const path = checkpointPath(scopeSha256);
      if (!existsSync(path)) return null;
      const value = checkpointSchema.parse(
        JSON.parse(await readFile(path, "utf8"))
      );
      return value.completed ? null : value;
    },

    writeCheckpoint(value: ToeicVocabularyCheckpoint) {
      return atomicJson(checkpointPath(value.scopeSha256), value);
    },

    async writeInventory(inventorySha256: string, value: unknown) {
      const key = `inventories/toeic-vocabulary-cache/${inventorySha256}.json`;
      await atomicJson(join(root, ...key.split("/")), value);
      return key;
    },
  };
}

export function checkpointEntries(
  value: ToeicVocabularyCheckpoint | null
): Record<string, ToeicVocabularyItem[]> {
  return value?.entries ?? {};
}
