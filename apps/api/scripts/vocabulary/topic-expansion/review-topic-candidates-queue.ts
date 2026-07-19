import "dotenv/config";

import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  createTopicCandidateReviewWorkerCommand,
  parseTopicCandidateQueueArguments,
} from "./topic-expansion-cli.js";
import type { VocabularyTopicDefinition } from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const candidateRoot = path.join(vocabularyRoot, "working/topic-candidates");
const startedAt = Date.now();

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const directoryExists = async (directoryPath: string) => {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const emit = (
  event: string,
  payload: Record<string, string | number | boolean | undefined>,
  json: boolean
) => {
  if (json) {
    console.log(JSON.stringify({ event, ...payload }));
    return;
  }
  const fields = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  console.log(`[${event}] ${fields.join(" ")}`);
};

const runTopic = async (
  topicSlug: string,
  input: { json: boolean; workerIndex: number }
) =>
  new Promise<void>((resolve, reject) => {
    const command = createTopicCandidateReviewWorkerCommand({
      platform: process.platform,
      topicSlug,
      json: input.json,
    });
    emit(
      "worker-start",
      {
        topic: topicSlug,
        worker: input.workerIndex,
        durationMs: Date.now() - startedAt,
      },
      input.json
    );
    const child = spawn(command.command, command.args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        emit(
          "worker-finished",
          {
            topic: topicSlug,
            worker: input.workerIndex,
            durationMs: Date.now() - startedAt,
          },
          input.json
        );
        resolve();
        return;
      }
      reject(
        new Error(`Topic candidate review failed for ${topicSlug}: ${code}`)
      );
    });
  });

async function main() {
  const arguments_ = parseTopicCandidateQueueArguments(process.argv.slice(2));
  const topics = (await readJson<VocabularyTopicDefinition[]>(topicsPath)).sort(
    (left, right) => left.order - right.order
  );
  const jobs = (
    await Promise.all(
      topics.map(async (topic) =>
        (await directoryExists(path.join(candidateRoot, topic.slug)))
          ? topic.slug
          : null
      )
    )
  ).filter((topicSlug): topicSlug is string => topicSlug !== null);
  let nextIndex = 0;
  const failures: Error[] = [];
  const workerCount = Math.min(arguments_.workers, jobs.length);

  emit(
    "run-start",
    {
      topic: "queue",
      workers: workerCount,
      jobs: jobs.length,
      durationMs: Date.now() - startedAt,
    },
    arguments_.json
  );

  const runWorker = async (workerIndex: number) => {
    while (failures.length === 0) {
      const topicSlug = jobs[nextIndex];
      nextIndex += 1;
      if (!topicSlug) return;
      await runTopic(topicSlug, {
        json: arguments_.json,
        workerIndex,
      });
    }
  };

  await Promise.allSettled(
    Array.from({ length: workerCount }, (_, index) =>
      runWorker(index + 1).catch((error: unknown) => {
        failures.push(
          error instanceof Error ? error : new Error(String(error))
        );
      })
    )
  );
  if (failures.length > 0) throw failures[0];

  emit(
    "run-finished",
    {
      topic: "queue",
      jobs: jobs.length,
      durationMs: Date.now() - startedAt,
    },
    arguments_.json
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
