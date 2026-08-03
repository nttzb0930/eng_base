import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
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
  ToeicWritingInventory,
  ToeicWritingStorage,
} from "./toeic-writing.types.js";

export function safeSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9._-]+$/u.test(value) || value === "." || value === "..") {
    throw new Error(`${label} contains unsafe path characters`);
  }

  return value;
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return (
    path !== "" &&
    path !== ".." &&
    !path.startsWith(`..${sep}`) &&
    !isAbsolute(path)
  );
}

function resolveStorageRoot(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}): string {
  const repositoryRoot = resolve(input.repositoryRoot);
  const privateParent = resolve(repositoryRoot, "var", "licensed-content");
  const root = resolve(
    input.configuredRoot ?? join(privateParent, "dautoeic", "writing")
  );
  const forbidden = new Set([
    repositoryRoot,
    resolve(repositoryRoot, ".."),
    resolve(homedir()),
    parse(root).root,
  ]);

  if (
    forbidden.has(root) ||
    (isInside(repositoryRoot, root) && !isInside(privateParent, root))
  ) {
    throw new Error("unsafe TOEIC Writing storage root");
  }

  return root;
}

function mediaExtension(contentType: string): ".jpg" | ".png" | ".webp" {
  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  } as const;
  const extension =
    extensions[contentType.toLowerCase() as keyof typeof extensions];
  if (!extension) {
    throw new Error("Unsupported TOEIC Writing image type");
  }

  return extension;
}

async function writeJsonAtomically(
  path: string,
  value: unknown
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function createToeicWritingStorage(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}): ToeicWritingStorage {
  const root = resolveStorageRoot(input);
  const packageDirectory = (sourceTaskId: string, sourceVersion: string) => {
    safeSegment(sourceTaskId, "sourceTaskId");
    safeSegment(sourceVersion, "sourceVersion");
    return join(root, sourceTaskId, sourceVersion);
  };

  return {
    async writeInventory(value) {
      safeSegment(value.inventorySha256, "inventorySha256");
      const storageKey = `inventories/${value.inventorySha256}.json`;
      await writeJsonAtomically(join(root, ...storageKey.split("/")), value);
      return storageKey;
    },

    async readInventory(sha256) {
      safeSegment(sha256, "inventorySha256");
      return JSON.parse(
        await readFile(join(root, "inventories", `${sha256}.json`), "utf8")
      ) as ToeicWritingInventory;
    },

    async writePackageFile(sourceTaskId, sourceVersion, name, value) {
      safeSegment(name, "package filename");
      await writeJsonAtomically(
        join(packageDirectory(sourceTaskId, sourceVersion), name),
        value
      );
    },

    async readPackageFile(sourceTaskId, sourceVersion, name) {
      safeSegment(name, "package filename");
      return JSON.parse(
        await readFile(
          join(packageDirectory(sourceTaskId, sourceVersion), name),
          "utf8"
        )
      ) as unknown;
    },

    async writeMediaStream({
      sourceTaskId,
      sourceVersion,
      stream,
      expectedBytes,
      contentType,
    }) {
      if (!contentType) {
        throw new Error("TOEIC Writing image content type is required");
      }
      const extension = mediaExtension(contentType);
      const directory = join(
        packageDirectory(sourceTaskId, sourceVersion),
        "media"
      );
      await mkdir(directory, { recursive: true });
      const partial = join(directory, "download.partial");
      const file = await open(partial, "w");
      const reader = stream.getReader();
      const hash = createHash("sha256");
      let bytes = 0;

      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          hash.update(chunk.value);
          await file.write(chunk.value);
        }
      } catch (error) {
        await file.close();
        await unlink(partial).catch(() => undefined);
        throw error;
      }

      await file.close();
      if (expectedBytes !== null && bytes !== expectedBytes) {
        await unlink(partial).catch(() => undefined);
        throw new Error("TOEIC Writing image byte verification failed");
      }

      const sha256 = hash.digest("hex");
      const target = join(directory, `${sha256}${extension}`);
      const reused = existsSync(target);
      if (reused) {
        await unlink(partial);
      } else {
        await rename(partial, target);
      }

      return {
        storageKey: relative(root, target).split(sep).join("/"),
        sha256,
        bytes,
        mimeType: contentType as "image/jpeg" | "image/png" | "image/webp",
        reused,
      };
    },

    async listPackages() {
      if (!existsSync(root)) return [];
      const packages: Array<{ sourceTaskId: string; sourceVersion: string }> =
        [];
      const taskDirectories = await readdir(root, { withFileTypes: true });
      for (const taskDirectory of taskDirectories) {
        if (
          !taskDirectory.isDirectory() ||
          taskDirectory.name === "inventories"
        ) {
          continue;
        }
        safeSegment(taskDirectory.name, "sourceTaskId");
        const versionDirectories = await readdir(
          join(root, taskDirectory.name),
          {
            withFileTypes: true,
          }
        );
        for (const versionDirectory of versionDirectories) {
          if (!versionDirectory.isDirectory()) continue;
          safeSegment(versionDirectory.name, "sourceVersion");
          packages.push({
            sourceTaskId: taskDirectory.name,
            sourceVersion: versionDirectory.name,
          });
        }
      }

      return packages.sort(
        (left, right) =>
          left.sourceTaskId.localeCompare(right.sourceTaskId) ||
          left.sourceVersion.localeCompare(right.sourceVersion)
      );
    },
  };
}
