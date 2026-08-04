import "dotenv/config";

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createTopicCandidateGenerationWorkerCommand,
  parseTopicCandidateQueueArguments,
} from "./topic-expansion-cli.js";
import type { VocabularyTopicDefinition } from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const topicsPath = path.join(repositoryRoot, "data/vocabulary/topics.json");
const startedAt = Date.now();

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

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
  input: { count: number; json: boolean; workerIndex: number }
) =>
  new Promise<void>((resolve, reject) => {
    const command = createTopicCandidateGenerationWorkerCommand({
      platform: process.platform,
      topicSlug,
      count: input.count,
      json: input.json,
    });
    emit(
      "worker-start",
      {
        topic: topicSlug,
        worker: input.workerIndex,
        count: input.count,
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
        new Error(`Topic candidate generation failed for ${topicSlug}: ${code}`)
      );
    });
  });

async function main() {
  const arguments_ = parseTopicCandidateQueueArguments(process.argv.slice(2));
  const topics = (await readJson<VocabularyTopicDefinition[]>(topicsPath)).sort(
    (left, right) => left.order - right.order
  );
  let nextIndex = 0;
  const failures: Error[] = [];
  const workerCount = Math.min(arguments_.workers, topics.length);

  emit(
    "run-start",
    {
      topic: "queue",
      workers: workerCount,
      jobs: topics.length,
      count: arguments_.count,
      durationMs: Date.now() - startedAt,
    },
    arguments_.json
  );

  const runWorker = async (workerIndex: number) => {
    while (failures.length === 0) {
      const topic = topics[nextIndex];
      nextIndex += 1;
      if (!topic) return;
      await runTopic(topic.slug, {
        count: arguments_.count,
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
      jobs: topics.length,
      durationMs: Date.now() - startedAt,
    },
    arguments_.json
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
