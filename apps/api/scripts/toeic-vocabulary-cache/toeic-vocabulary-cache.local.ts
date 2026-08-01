import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { z } from "zod";

const inventorySchema = z
  .object({
    selectedTests: z.array(
      z.object({ sourceTestId: z.string().min(1) }).passthrough()
    ),
  })
  .passthrough();
const contentSchema = z
  .object({
    sourceTestId: z.string().min(1),
    parts: z.array(
      z
        .object({
          part: z.number().int().min(1).max(7),
          questions: z.array(
            z.object({ sourceQuestionId: z.string().min(1) }).passthrough()
          ),
        })
        .passthrough()
    ),
  })
  .passthrough();

async function contentFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await contentFiles(path)));
    else if (entry.isFile() && entry.name === "content.json") files.push(path);
  }
  return files;
}

export async function loadLocalToeicVocabularyScope(input: {
  repositoryRoot: string;
  readingInventorySha256: string;
}) {
  if (!/^[a-f0-9]{64}$/u.test(input.readingInventorySha256)) {
    throw new Error("reading inventory SHA must be a lowercase SHA-256");
  }
  const privateRoot = resolve(
    input.repositoryRoot,
    "var",
    "licensed-content",
    "dautoeic"
  );
  const inventory = inventorySchema.parse(
    JSON.parse(
      await readFile(
        join(
          privateRoot,
          "inventories",
          "toeic-reading-practice",
          `${input.readingInventorySha256}.json`
        ),
        "utf8"
      )
    )
  );
  const sourceTestIds = [
    ...new Set(inventory.selectedTests.map((test) => test.sourceTestId)),
  ].sort();
  const selected = new Set(sourceTestIds);
  const questionIds = new Set<string>();

  for (const kind of ["toeic-listening-practice", "toeic-reading-practice"]) {
    for (const sourceTestId of sourceTestIds) {
      for (const path of await contentFiles(
        join(privateRoot, kind, sourceTestId)
      )) {
        const content = contentSchema.parse(
          JSON.parse(await readFile(path, "utf8"))
        );
        if (!selected.has(content.sourceTestId)) continue;
        for (const part of content.parts) {
          for (const question of part.questions) {
            questionIds.add(question.sourceQuestionId);
          }
        }
      }
    }
  }

  return {
    sourceTestIds,
    questionIds: [...questionIds].sort(),
  };
}
