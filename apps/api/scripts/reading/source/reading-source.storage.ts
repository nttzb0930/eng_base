import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { once } from "node:events";

import type {
  ReadingSourceInventory,
  ReadingSourceStorage,
} from "./reading-source.types.js";

function isInside(parent: string, child: string) {
  const path = relative(parent, child);
  return path !== "" && !path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path);
}

function resolveThroughExistingParent(target: string) {
  let existing = target;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realExisting = realpathSync(existing);
  return resolve(realExisting, relative(existing, target));
}

export function resolveReadingSourceStorageRoot(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}) {
  const repositoryRoot = resolve(input.repositoryRoot);
  const privateParent = resolve(
    repositoryRoot,
    "var",
    "licensed-content",
  );
  const target = resolve(
    input.configuredRoot ??
      join(privateParent, "dautoeic"),
  );
  const filesystemRoot = parse(target).root;
  const broadTargets = [
    repositoryRoot,
    resolve(homedir()),
    filesystemRoot,
    resolve(repositoryRoot, ".."),
  ];
  if (broadTargets.some((broad) => target === broad)) {
    throw new Error("unsafe Reading source storage root");
  }

  if (isInside(repositoryRoot, target) && !isInside(privateParent, target)) {
    throw new Error("unsafe Reading source storage root");
  }

  if (isInside(privateParent, target)) {
    const resolvedParent = resolveThroughExistingParent(privateParent);
    const resolvedTarget = resolveThroughExistingParent(target);
    if (!isInside(resolvedParent, resolvedTarget)) {
      throw new Error("unsafe Reading source storage root");
    }
  }

  return target;
}

function assertSafeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9._-]+$/u.test(value) || value === "." || value === "..") {
    throw new Error(`${label} contains unsafe path characters`);
  }
}

async function writeJsonAtomic(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(partial, path);
}

export function createFileReadingSourceStorage(input: {
  repositoryRoot: string;
  configuredRoot?: string;
}): ReadingSourceStorage {
  const root = resolveReadingSourceStorageRoot(input);
  mkdirSync(root, { recursive: true });

  const packageDirectory = (sourceId: string, sourceVersion: string) => {
    assertSafeSegment(sourceId, "sourceId");
    assertSafeSegment(sourceVersion, "sourceVersion");
    return join(root, "reading", sourceId, sourceVersion);
  };

  return {
    async writeInventory(inventory) {
      assertSafeSegment(inventory.inventorySha256, "inventorySha256");
      const storageKey = `inventories/reading/${inventory.inventorySha256}.json`;
      await writeJsonAtomic(join(root, ...storageKey.split("/")), inventory);
      return storageKey;
    },

    async readApprovedInventory(sha256) {
      assertSafeSegment(sha256, "inventorySha256");
      const content = await readFile(
        join(root, "inventories", "reading", `${sha256}.json`),
        "utf8",
      );
      return JSON.parse(content) as ReadingSourceInventory;
    },

    async writePackageFile(sourceId, sourceVersion, name, value) {
      await writeJsonAtomic(
        join(packageDirectory(sourceId, sourceVersion), name),
        value,
      );
    },

    async writeRejectedValidation(sourceId, sourceVersion, value) {
      assertSafeSegment(sourceId, "sourceId");
      assertSafeSegment(sourceVersion, "sourceVersion");
      await writeJsonAtomic(
        join(
          root,
          "rejected",
          "reading",
          sourceId,
          sourceVersion,
          "validation.json",
        ),
        value,
      );
    },

    async writeMedia({ sourceId, sourceVersion, mediaId, response }) {
      assertSafeSegment(mediaId, "mediaId");
      if (!response.body) throw new Error("Reading media response has no body");
      const mimeType = response.headers.get("content-type");
      if (!mimeType?.startsWith("image/")) {
        throw new Error("Reading media response is not an image");
      }

      const directory = join(
        packageDirectory(sourceId, sourceVersion),
        "media",
      );
      await mkdir(directory, { recursive: true });
      const target = join(directory, mediaId);
      const partial = `${target}.partial`;
      const output = createWriteStream(partial, { flags: "w" });
      const hash = createHash("sha256");
      let bytes = 0;

      try {
        for await (const chunk of response.body) {
          const buffer = Buffer.from(chunk);
          bytes += buffer.byteLength;
          hash.update(buffer);
          if (!output.write(buffer)) await once(output, "drain");
        }
        output.end();
        await once(output, "finish");

        const declaredLength = response.headers.get("content-length");
        if (declaredLength !== null && Number(declaredLength) !== bytes) {
          throw new Error(
            `Reading expected ${declaredLength} media bytes, received ${bytes}`,
          );
        }
        await rename(partial, target);
      } catch (error) {
        output.destroy();
        await rm(partial, { force: true });
        throw error;
      }

      return {
        storageKey: relative(root, target).split(sep).join("/"),
        bytes,
        sha256: hash.digest("hex"),
        mimeType,
      };
    },

    async packageExists(sourceId, sourceVersion) {
      return existsSync(
        join(packageDirectory(sourceId, sourceVersion), "manifest.json"),
      );
    },

    async listCompletePackages() {
      const readingRoot = join(root, "reading");
      if (!existsSync(readingRoot)) return [];
      const packages: Array<{ sourceId: string; sourceVersion: string }> = [];
      for (const sourceId of await readdir(readingRoot)) {
        assertSafeSegment(sourceId, "sourceId");
        const sourceDirectory = join(readingRoot, sourceId);
        for (const sourceVersion of await readdir(sourceDirectory)) {
          assertSafeSegment(sourceVersion, "sourceVersion");
          if (
            existsSync(
              join(
                packageDirectory(sourceId, sourceVersion),
                "manifest.json",
              ),
            )
          ) {
            packages.push({ sourceId, sourceVersion });
          }
        }
      }
      return packages.sort((left, right) =>
        `${left.sourceId}/${left.sourceVersion}`.localeCompare(
          `${right.sourceId}/${right.sourceVersion}`,
        ),
      );
    },

    async readPackageFile(sourceId, sourceVersion, name) {
      const content = await readFile(
        join(packageDirectory(sourceId, sourceVersion), name),
        "utf8",
      );
      return JSON.parse(content) as unknown;
    },
  };
}
