# Topic Expansion Worker Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe queue runner that expands many vocabulary topics faster by running topics in parallel while keeping chunks sequential inside each topic.

**Architecture:** Keep the existing single-topic generator as the source of truth. Add queue CLI parsing helpers and a queue runner script that spawns bounded child processes for different topics. Each topic job calls the existing single-topic runner with `--chunks` and `--chunk-size`, so artifact format and validation remain unchanged.

**Tech Stack:** TypeScript, Node.js `child_process`, existing vocabulary catalog scripts, `tsx --test`.

## Global Constraints

- Do not write database state.
- Do not run multiple chunks for the same topic in parallel.
- Do not log prompts, raw AI responses, API keys, cookies, or database credentials.
- Use `VOCAB_TOPIC_MINIMUM_WORDS` to calculate deficits.
- Keep generated artifacts under `data/vocabulary/working/topic-expansion/`.

---

### Task 1: Queue CLI helpers

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- Produces: `parseTopicExpansionQueueArguments(args: string[]): TopicExpansionQueueArguments`
- Produces: `createTopicExpansionQueueJobs(deficits: TopicDeficit[], options): TopicExpansionQueueJob[]`

- [ ] Write failing tests for default queue args, explicit queue args, invalid workers/chunk values, and deficit-to-job mapping.
- [ ] Run focused test and verify failure.
- [ ] Implement helpers.
- [ ] Run focused test and verify pass.

### Task 2: Queue runner script

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-expansion/generate-topic-expansion-queue.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- Consumes: `parseTopicExpansionQueueArguments`
- Consumes: `createTopicExpansionQueueJobs`
- Produces script: `data:generate-topic-expansion-queue`

- [ ] Write source-boundary test proving the runner uses bounded workers and calls the existing single-topic script.
- [ ] Run focused test and verify failure.
- [ ] Implement runner.
- [ ] Add package script.
- [ ] Run focused test and verify pass.

### Task 3: Documentation and verification

**Files:**

- Modify: `docs/data/vocabulary-pipeline.md`

- [ ] Document queue command and concurrency rule.
- [ ] Run topic-expansion focused test.
- [ ] Run vocabulary script test suite.
- [ ] Run API type-check, lint, build.
- [ ] Run prettier check and `git diff --check`.
- [ ] Commit changes.
