import "dotenv/config";

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  calculateTopicDeficits,
  type TopicDeficit,
} from "./topic-expansion.js";
import {
  createTopicExpansionQueueJobs,
  createTopicExpansionWorkerCommand,
  parseTopicExpansionQueueArguments,
  type TopicExpansionQueueJob,
} from "./topic-expansion-cli.js";
import {
  assertVocabularySourcesValid,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const vocabularyRoot = path.join(repositoryRoot, "data/vocabulary");
const catalogPath = path.join(vocabularyRoot, "vocabulary-catalog.json");
const topicsPath = path.join(vocabularyRoot, "topics.json");
const defaultChunkSize = Number.parseInt(
  process.env.VOCAB_TOPIC_EXPANSION_CHUNK_SIZE ?? "30",
  10
);
const startedAt = Date.now();

const readJson = async <T>(filePath: string) =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const emit = (
  event: string,
  payload: Record<string, string | number | boolean | undefined>,
  json: boolean
) => {
  const message = { event, ...payload };
  if (json) {
    console.log(JSON.stringify(message));
    return;
  }
  const fields = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  console.log(`[${event}] ${fields.join(" ")}`);
};

const runTopicJob = async (
  job: TopicExpansionQueueJob,
  input: {
    chunkSize: number;
    json: boolean;
    workerIndex: number;
  }
): Promise<void> =>
  new Promise((resolve, reject) => {
    const command = createTopicExpansionWorkerCommand({
      platform: process.platform,
      topicSlug: job.topicSlug,
      chunks: job.chunks,
      chunkSize: input.chunkSize,
      json: input.json,
    });
    emit(
      "worker-start",
      {
        topic: job.topicSlug,
        worker: input.workerIndex,
        requestedWords: job.requestedCount,
        chunks: job.chunks,
        chunkSize: input.chunkSize,
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
            topic: job.topicSlug,
            worker: input.workerIndex,
            chunks: job.chunks,
            durationMs: Date.now() - startedAt,
          },
          input.json
        );
        resolve();
        return;
      }
      reject(
        new Error(`Topic expansion worker failed for ${job.topicSlug}: ${code}`)
      );
    });
  });

async function runQueue(
  jobs: TopicExpansionQueueJob[],
  input: {
    workers: number;
    chunkSize: number;
    json: boolean;
  }
) {
  let nextIndex = 0;
  const workerCount = Math.min(input.workers, jobs.length);
  const failures: Error[] = [];

  const runWorker = async (workerIndex: number) => {
    while (failures.length === 0) {
      const job = jobs[nextIndex];
      nextIndex += 1;
      if (!job) return;
      await runTopicJob(job, {
        chunkSize: input.chunkSize,
        json: input.json,
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
}

async function main() {
  const arguments_ = parseTopicExpansionQueueArguments(process.argv.slice(2));
  const [catalog, topics] = await Promise.all([
    readJson<VocabularyCatalogItem[]>(catalogPath),
    readJson<VocabularyTopicDefinition[]>(topicsPath),
  ]);
  assertVocabularySourcesValid(topics, catalog);
  const minimumWords = Number.parseInt(
    process.env.VOCAB_TOPIC_MINIMUM_WORDS ?? "30",
    10
  );
  const chunkSize = arguments_.chunkSize ?? defaultChunkSize;
  const deficits: TopicDeficit[] = calculateTopicDeficits(
    topics,
    catalog,
    minimumWords
  );
  const jobs = createTopicExpansionQueueJobs(deficits, {
    chunkSize,
    chunksPerTopic: arguments_.chunksPerTopic,
  });

  emit(
    "run-start",
    {
      topic: "queue",
      workers: arguments_.workers,
      jobs: jobs.length,
      chunkSize,
      durationMs: Date.now() - startedAt,
    },
    arguments_.json
  );

  if (jobs.length > 0) {
    await runQueue(jobs, {
      workers: arguments_.workers,
      chunkSize,
      json: arguments_.json,
    });
  }

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
