import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import {
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";

import type {
  ToeicReadingInventory,
  ToeicReadingStorage,
} from "./toeic-reading-practice.types.js";

function safeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value) || value === "." || value === "..") {
    throw new Error(`${label} contains unsafe path characters`);
  }
}

function inside(parent: string, child: string) {
  const result = relative(parent, child);
  return (
    result !== "" &&
    result !== ".." &&
    !result.startsWith(`..${sep}`) &&
    !isAbsolute(result)
  );
}

function resolveRoot(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}) {
  const repositoryRoot = resolve(input.repositoryRoot);
  const privateParent = resolve(repositoryRoot, "var", "licensed-content");
  const root = resolve(input.configuredRoot ?? join(privateParent, "dautoeic"));
  if (
    [
      repositoryRoot,
      resolve(repositoryRoot, ".."),
      resolve(homedir()),
      parse(root).root,
    ].includes(root)
  ) {
    throw new Error("unsafe TOEIC Reading storage root");
  }
  if (inside(repositoryRoot, root) && !inside(privateParent, root)) {
    throw new Error("unsafe TOEIC Reading storage root");
  }
  return root;
}

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function createFileToeicReadingStorage(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}): ToeicReadingStorage {
  const root = resolveRoot(input);
  const packageDirectory = (sourceTestId: string, sourceVersion: string) => {
    safeSegment(sourceTestId, "sourceTestId");
    safeSegment(sourceVersion, "sourceVersion");
    return join(root, "toeic-reading-practice", sourceTestId, sourceVersion);
  };

  return {
    async writeInventory(value) {
      safeSegment(value.inventorySha256, "inventorySha256");
      const key = `inventories/toeic-reading-practice/${value.inventorySha256}.json`;
      await atomicJson(join(root, ...key.split("/")), value);
      return key;
    },

    async readInventory(sha256) {
      safeSegment(sha256, "inventorySha256");
      return JSON.parse(
        await readFile(
          join(root, "inventories", "toeic-reading-practice", `${sha256}.json`),
          "utf8"
        )
      ) as ToeicReadingInventory;
    },

    async packageExists(sourceTestId, sourceVersion) {
      return existsSync(
        join(packageDirectory(sourceTestId, sourceVersion), "manifest.json")
      );
    },

    async writePackageFile(sourceTestId, sourceVersion, name, value) {
      await atomicJson(
        join(packageDirectory(sourceTestId, sourceVersion), name),
        value
      );
    },

    async listCompletePackages() {
      const packageRoot = join(root, "toeic-reading-practice");
      if (!existsSync(packageRoot)) return [];
      const values: Array<{ sourceTestId: string; sourceVersion: string }> = [];
      for (const sourceTestId of await readdir(packageRoot)) {
        safeSegment(sourceTestId, "sourceTestId");
        for (const sourceVersion of await readdir(
          join(packageRoot, sourceTestId)
        )) {
          safeSegment(sourceVersion, "sourceVersion");
          if (
            existsSync(
              join(
                packageDirectory(sourceTestId, sourceVersion),
                "manifest.json"
              )
            )
          ) {
            values.push({ sourceTestId, sourceVersion });
          }
        }
      }
      return values.sort((left, right) =>
        `${left.sourceTestId}/${left.sourceVersion}`.localeCompare(
          `${right.sourceTestId}/${right.sourceVersion}`
        )
      );
    },

    async readPackageFile(sourceTestId, sourceVersion, name) {
      safeSegment(name, "package filename");
      return JSON.parse(
        await readFile(
          join(packageDirectory(sourceTestId, sourceVersion), name),
          "utf8"
        )
      ) as unknown;
    },
  };
}
