# Topic Candidate Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a candidate-first Topic expansion pipeline so AI proposes word identities first, then validation/dedupe filters them before full vocabulary enrichment.

**Architecture:** Add focused candidate types/helpers beside Topic expansion. Add a candidate generator script that calls the provider for `{ word, pos, cefrLevel }` only and writes review artifacts. Existing full Topic expansion remains available for small batches.

**Tech Stack:** TypeScript, Node.js scripts, existing Gemini/OpenAI-compatible provider config, `tsx --test`.

## Global Constraints

- No database writes in candidate generation.
- No canonical catalog writes in candidate generation.
- Dedupe candidates against catalog and pending candidate artifacts.
- Candidate duplicates are written to `rejected`, not thrown as fatal validation errors.
- Keep artifacts under `data/vocabulary/working/topic-candidates/`.

---

### Task 1: Candidate helpers

**Files:**

- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.ts`
- Modify: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion-cli.ts`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- `TopicCandidateArtifact`
- `TopicCandidate`
- `dedupeTopicCandidates(catalog, pendingArtifacts, artifact)`
- `parseTopicCandidateGenerationArguments(args)`

### Task 2: Candidate generator script

**Files:**

- Create: `apps/api/scripts/vocabulary/topic-expansion/generate-topic-candidates.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/scripts/vocabulary/topic-expansion/topic-expansion.test.ts`

**Interfaces:**

- package script `data:generate-topic-candidates`
- Writes `working/topic-candidates/<topic>/chunk-001.json`

### Task 3: Docs and verification

**Files:**

- Modify: `docs/data/vocabulary-pipeline.md`

**Verification:**

- Focused Topic expansion tests.
- Vocabulary script test suite.
- API type-check, lint, build.
- Prettier and `git diff --check`.
