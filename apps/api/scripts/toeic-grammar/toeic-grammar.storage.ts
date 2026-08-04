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

function inside(parent: string, child: string) {
  const value = relative(parent, child);
  return (
    value !== "" &&
    value !== ".." &&
    !value.startsWith(`..${sep}`) &&
    !isAbsolute(value)
  );
}

function safeSha(value: string) {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error("Invalid TOEIC Grammar SHA-256");
  }
}

function safeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value) || value === "." || value === "..") {
    throw new Error(`${label} contains unsafe path characters`);
  }
}

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function createFileToeicGrammarStorage(input: {
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
    ].includes(root) ||
    (inside(repositoryRoot, root) && !inside(privateParent, root))
  ) {
    throw new Error("unsafe TOEIC Grammar storage root");
  }
  const snapshotDirectory = (snapshotVersion: string) => {
    safeSegment(snapshotVersion, "snapshotVersion");
    return join(root, "toeic-grammar", snapshotVersion);
  };

  return {
    root,
    async writeInventory(value: { inventorySha256?: unknown }) {
      if (typeof value.inventorySha256 !== "string") {
        throw new Error("Inventory SHA-256 is required");
      }
      safeSha(value.inventorySha256);
      const key = `inventories/toeic-grammar/${value.inventorySha256}.json`;
      await atomicJson(join(root, ...key.split("/")), value);
      return key;
    },
    async readInventory(sha256: string) {
      safeSha(sha256);
      return JSON.parse(
        await readFile(
          join(root, "inventories", "toeic-grammar", `${sha256}.json`),
          "utf8"
        )
      ) as unknown;
    },
    async writeCheckpoint(snapshotVersion: string, value: unknown) {
      await atomicJson(
        join(snapshotDirectory(snapshotVersion), "checkpoint.json"),
        value
      );
    },
    async readCheckpoint(snapshotVersion: string) {
      const path = join(snapshotDirectory(snapshotVersion), "checkpoint.json");
      if (!existsSync(path)) return null;
      return JSON.parse(await readFile(path, "utf8")) as unknown;
    },
    async writeSnapshotFile(
      snapshotVersion: string,
      name: string,
      value: unknown
    ) {
      safeSegment(name, "snapshot filename");
      await atomicJson(join(snapshotDirectory(snapshotVersion), name), value);
    },
    async readSnapshotFile(snapshotVersion: string, name: string) {
      safeSegment(name, "snapshot filename");
      return JSON.parse(
        await readFile(join(snapshotDirectory(snapshotVersion), name), "utf8")
      ) as unknown;
    },
    async listCompleteSnapshots() {
      const directory = join(root, "toeic-grammar");
      if (!existsSync(directory)) return [];
      const values: string[] = [];
      for (const name of await readdir(directory)) {
        safeSegment(name, "snapshotVersion");
        if (existsSync(join(snapshotDirectory(name), "manifest.json"))) {
          values.push(name);
        }
      }
      return values.sort();
    },
  };
}
