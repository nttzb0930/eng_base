import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  pictureContextCandidateSchema,
  type PictureContextCandidate,
} from "./toeic-writing-ai.validation";

type CandidateIdentity = Pick<
  PictureContextCandidate,
  "sourceTaskId" | "sourceVersion" | "imageSha256"
>;

function safeSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9._-]+$/u.test(value) || value === "." || value === "..") {
    throw new Error(`${label} contains unsafe path characters`);
  }
  return value;
}

export function createToeicWritingAiStorage(configuredRoot: string) {
  const root = resolve(configuredRoot);
  const candidatePath = (
    identity: CandidateIdentity,
    promptVersion: string
  ) => {
    const segments = [
      safeSegment(identity.sourceTaskId, "sourceTaskId"),
      safeSegment(identity.sourceVersion, "sourceVersion"),
      safeSegment(identity.imageSha256, "imageSha256"),
      `${safeSegment(promptVersion, "promptVersion")}.json`,
    ];
    return join(root, "contexts", ...segments);
  };

  return {
    candidatePath,
    async readCandidate(identity: CandidateIdentity, promptVersion: string) {
      const path = candidatePath(identity, promptVersion);
      if (!existsSync(path)) return null;
      return pictureContextCandidateSchema.parse(
        JSON.parse(await readFile(path, "utf8"))
      );
    },
    async writeCandidate(candidate: PictureContextCandidate) {
      const parsed = pictureContextCandidateSchema.parse(candidate);
      const path = candidatePath(parsed, parsed.promptVersion);
      await mkdir(dirname(path), { recursive: true });
      const partial = `${path}.partial`;
      await writeFile(partial, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      await rename(partial, path);
    },
    async listCandidates() {
      const contextsRoot = join(root, "contexts");
      if (!existsSync(contextsRoot)) return [];
      const paths: string[] = [];
      const visit = async (directory: string): Promise<void> => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) await visit(path);
          else if (entry.isFile() && entry.name.endsWith(".json"))
            paths.push(path);
        }
      };
      await visit(contextsRoot);
      const candidates = await Promise.all(
        paths
          .sort()
          .map(async (path) =>
            pictureContextCandidateSchema.parse(
              JSON.parse(await readFile(path, "utf8"))
            )
          )
      );
      return candidates;
    },
  };
}

export type ToeicWritingAiStorage = ReturnType<
  typeof createToeicWritingAiStorage
>;
