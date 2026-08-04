# Topic Candidate Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI reviewer script that classifies generated topic candidates and filters weak candidates before enrichment.

**Architecture:** Add pure review-application helpers beside candidate helpers. Add CLI parsing for `--all` and `--chunk`. Add a script that reads candidate artifacts, calls the configured provider with a strict JSON schema, applies review decisions, and writes artifacts atomically.

**Tech Stack:** TypeScript, Node.js scripts, existing Gemini/OpenAI-compatible provider config, `tsx --test`.

## Global Constraints

- No catalog writes.
- No database writes.
- Only update ignored working files under `data/vocabulary/working/topic-candidates/`.
- Do not log prompts, raw provider responses, API keys, cookies, or database credentials.
- Keep deterministic helper behavior tested without provider calls.

---

### Task 1: Review helper and CLI

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.ts`
- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- `TopicCandidateReviewDecision`
- `applyTopicCandidateReview(artifact, decisions)`
- `parseTopicCandidateReviewArguments(args)`

### Task 2: Review script

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-expansion/review-topic-candidates.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- package script `data:review-topic-candidates`

### Task 3: Docs and verification

**Files:**

- Modify: `docs/data/vocabulary-pipeline.md`

**Verification:**

- Focused Topic expansion tests.
- Vocabulary script suite.
- API type-check, lint, build.
- Prettier and `git diff --check`.
