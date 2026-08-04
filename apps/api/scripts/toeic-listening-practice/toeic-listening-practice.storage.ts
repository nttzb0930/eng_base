import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
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

import type { ToeicReadingInventory } from "../toeic-reading-practice/toeic-reading-practice.types.js";
import type {
  ToeicListeningInventory,
  ToeicListeningStorage,
} from "./toeic-listening-practice.types.js";

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
    throw new Error("unsafe TOEIC Listening storage root");
  }
  if (inside(repositoryRoot, root) && !inside(privateParent, root)) {
    throw new Error("unsafe TOEIC Listening storage root");
  }
  return root;
}

function extension(contentType: string) {
  const values: Record<string, string> = {
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const value = values[contentType.toLowerCase()];
  if (!value) throw new Error("Unsupported Listening media type");
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

export function createFileToeicListeningStorage(
  input:
    | string
    | {
        repositoryRoot: string;
        configuredRoot?: string;
      }
): ToeicListeningStorage {
  const options = typeof input === "string" ? { repositoryRoot: input } : input;
  const root = resolveRoot(options);
  const packageDirectory = (sourceTestId: string, sourceVersion: string) => {
    safeSegment(sourceTestId, "sourceTestId");
    safeSegment(sourceVersion, "sourceVersion");
    return join(root, "toeic-listening-practice", sourceTestId, sourceVersion);
  };
  const resolveMediaPath = (
    sourceTestId: string,
    mediaId: string,
    contentType: string
  ) => {
    safeSegment(sourceTestId, "sourceTestId");
    safeSegment(mediaId, "mediaId");
    return join(
      root,
      "toeic-listening-practice",
      sourceTestId,
      "media",
      `${mediaId}${extension(contentType)}`
    );
  };

  return {
    async readReadingInventory(sha256) {
      safeSegment(sha256, "reading inventory SHA");
      return JSON.parse(
        await readFile(
          join(root, "inventories", "toeic-reading-practice", `${sha256}.json`),
          "utf8"
        )
      ) as ToeicReadingInventory;
    },

    async readInventory(sha256) {
      safeSegment(sha256, "Listening inventory SHA");
      return JSON.parse(
        await readFile(
          join(
            root,
            "inventories",
            "toeic-listening-practice",
            `${sha256}.json`
          ),
          "utf8"
        )
      ) as ToeicListeningInventory;
    },

    async writeInventory(value) {
      safeSegment(value.inventorySha256, "Listening inventory SHA");
      const key = `inventories/toeic-listening-practice/${value.inventorySha256}.json`;
      await atomicJson(join(root, ...key.split("/")), value);
      return key;
    },

    resolveMediaPath,

    async ensureMediaDirectory(path) {
      await mkdir(dirname(path), { recursive: true });
    },

    async downloadMedia(download) {
      const target = resolveMediaPath(
        download.sourceTestId,
        download.mediaId,
        download.contentType
      );
      await mkdir(dirname(target), { recursive: true });
      if (existsSync(target)) {
        const current = await digest(target);
        if (
          (download.expectedBytes === null ||
            current.bytes === download.expectedBytes) &&
          (!download.expectedSha256 ||
            current.sha256 === download.expectedSha256)
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
      if (offset > 0 && response.status !== 206) {
        await writeFile(partial, response.bytes);
      } else if (offset > 0) {
        await appendFile(partial, response.bytes);
      } else {
        await writeFile(partial, response.bytes);
      }
      const complete = await digest(partial);
      if (
        (download.expectedBytes !== null &&
          complete.bytes !== download.expectedBytes) ||
        (download.expectedSha256 && complete.sha256 !== download.expectedSha256)
      ) {
        throw new Error("Listening media verification failed");
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

    async packageExists(sourceTestId, sourceVersion) {
      return existsSync(
        join(packageDirectory(sourceTestId, sourceVersion), "manifest.json")
      );
    },

    async writePackageFile(sourceTestId, sourceVersion, name, value) {
      safeSegment(name, "package filename");
      await atomicJson(
        join(packageDirectory(sourceTestId, sourceVersion), name),
        value
      );
    },

    async listCompletePackages() {
      const packageRoot = join(root, "toeic-listening-practice");
      if (!existsSync(packageRoot)) return [];
      const values: Array<{ sourceTestId: string; sourceVersion: string }> = [];
      for (const sourceTestId of await readdir(packageRoot)) {
        const testRoot = join(packageRoot, sourceTestId);
        if (!(await stat(testRoot)).isDirectory() || sourceTestId === "media")
          continue;
        safeSegment(sourceTestId, "sourceTestId");
        for (const sourceVersion of await readdir(testRoot)) {
          const candidate = join(testRoot, sourceVersion);
          if (!(await stat(candidate)).isDirectory()) continue;
          safeSegment(sourceVersion, "sourceVersion");
          if (existsSync(join(candidate, "manifest.json"))) {
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
