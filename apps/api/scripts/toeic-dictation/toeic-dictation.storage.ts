import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

import type {
  ToeicDictationInventory,
  ToeicDictationStorage,
} from "./toeic-dictation.types";

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

function resolveRoot(input: { repositoryRoot: string; configuredRoot?: string }) {
  const repositoryRoot = resolve(input.repositoryRoot);
  const privateParent = resolve(repositoryRoot, "var", "licensed-content");
  const root = resolve(input.configuredRoot ?? join(privateParent, "dautoeic"));
  if (
    [repositoryRoot, resolve(repositoryRoot, ".."), resolve(homedir()), parse(root).root].includes(root) ||
    (inside(repositoryRoot, root) && !inside(privateParent, root))
  ) {
    throw new Error("unsafe TOEIC Dictation storage root");
  }
  return root;
}

function extension(contentType: string) {
  const values: Record<string, string> = {
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
  };
  const value = values[contentType.toLowerCase()];
  if (!value) throw new Error("Unsupported TOEIC Dictation media type");
  return value;
}

async function digest(path: string) {
  const bytes = await readFile(path);
  return {
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function createFileToeicDictationStorage(
  input: string | { repositoryRoot: string; configuredRoot?: string }
): ToeicDictationStorage {
  const options = typeof input === "string" ? { repositoryRoot: input } : input;
  const root = resolveRoot(options);
  const packageRoot = join(root, "toeic-dictation", "2026");
  const packageDirectory = (packageVersion: string) => {
    safeSegment(packageVersion, "packageVersion");
    return join(packageRoot, packageVersion);
  };

  return {
    async readInventory(sha256) {
      safeSegment(sha256, "inventory SHA");
      return JSON.parse(
        await readFile(
          join(root, "inventories", "toeic-dictation", "2026", `${sha256}.json`),
          "utf8"
        )
      ) as ToeicDictationInventory;
    },

    async writeInventory(value) {
      safeSegment(value.inventorySha256, "inventory SHA");
      const key = `inventories/toeic-dictation/2026/${value.inventorySha256}.json`;
      await atomicJson(join(root, ...key.split("/")), value);
      return key;
    },

    resolveMediaPath(packageVersion, mediaId, contentType) {
      safeSegment(packageVersion, "packageVersion");
      safeSegment(mediaId, "mediaId");
      return join(packageDirectory(packageVersion), "media", `${mediaId}${extension(contentType)}`);
    },

    async ensureMediaDirectory(path) {
      await mkdir(dirname(path), { recursive: true });
    },

    async downloadMedia(download) {
      const target = this.resolveMediaPath(
        download.packageVersion,
        download.mediaId,
        download.contentType
      );
      await mkdir(dirname(target), { recursive: true });
      if (existsSync(target)) {
        const current = await digest(target);
        if (
          (download.expectedBytes === null || current.bytes === download.expectedBytes) &&
          (!download.expectedSha256 || current.sha256 === download.expectedSha256)
        ) {
          return {
            absolutePath: target,
            storagePath: relative(root, target).split(sep).join("/"),
            ...current,
            contentType: download.contentType,
            reused: true,
          };
        }
        await unlink(target);
      }
      const partial = `${target}.part`;
      const offset = existsSync(partial) ? (await stat(partial)).size : 0;
      const response = await download.request(offset);
      if (offset > 0 && response.status === 206) {
        await appendFile(partial, response.bytes);
      } else {
        await writeFile(partial, response.bytes);
      }
      const complete = await digest(partial);
      if (
        (download.expectedBytes !== null && complete.bytes !== download.expectedBytes) ||
        (download.expectedSha256 && complete.sha256 !== download.expectedSha256)
      ) {
        throw new Error("TOEIC Dictation media verification failed");
      }
      await rename(partial, target);
      return {
        absolutePath: target,
        storagePath: relative(root, target).split(sep).join("/"),
        ...complete,
        contentType: response.contentType ?? download.contentType,
        reused: false,
      };
    },

    async writePackageFile(packageVersion, name, value) {
      safeSegment(name, "package filename");
      await atomicJson(join(packageDirectory(packageVersion), name), value);
    },

    async readPackageFile(packageVersion, name) {
      safeSegment(name, "package filename");
      return JSON.parse(
        await readFile(join(packageDirectory(packageVersion), name), "utf8")
      ) as unknown;
    },
  };
}
