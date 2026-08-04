# Topic Candidate Queues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add separate queue runners for generating and reviewing topic candidate artifacts across all topics.

**Architecture:** Reuse existing single-topic scripts by spawning package commands with bounded workers. Add command builders and parser helpers in `topic-expansion-cli.ts` so Windows process spawning remains tested.

**Tech Stack:** TypeScript, Node.js `child_process`, existing vocabulary scripts, `tsx --test`.

## Global Constraints

- No catalog writes.
- No database writes.
- Generate and review remain separate commands.
- Queue workers process different topics in parallel.
- Preserve taxonomy order from `topics.json`.

---

### Task 1: Queue CLI helpers

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- `parseTopicCandidateQueueArguments(args)`
- `createTopicCandidateGenerationWorkerCommand(input)`
- `createTopicCandidateReviewWorkerCommand(input)`

### Task 2: Queue runner scripts

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-expansion/generate-topic-candidates-queue.ts`
- Create: `apps/api/scripts/vocabulary/topic-expansion/review-topic-candidates-queue.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- package script `data:generate-topic-candidates-queue`
- package script `data:review-topic-candidates-queue`

### Task 3: Docs and verification

**Files:**

- Modify: `docs/data/vocabulary-pipeline.md`

**Verification:**

- Focused Topic expansion tests.
- Vocabulary workflow tests.
- API type-check, lint, build.
- Prettier and `git diff --check`.
