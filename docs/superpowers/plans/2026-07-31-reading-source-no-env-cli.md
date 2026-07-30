# Reading Source No-Env CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Reading inventory, download, and validation without loading repository `.env`, while keeping the public source profile versioned and authorization material outside Git.

**Architecture:** A checked-in JSON profile owns non-secret source URL, host allowlist, license/provenance metadata, and safe runtime defaults. A small CLI parser resolves `--authorization` or a gitignored private authorization file and `--approved-sha`; only the candidate-import command retains `dotenv` because it connects to Prisma.

**Tech Stack:** TypeScript, Node.js CLI, Zod, Node test runner, pnpm.

## Global Constraints

- Do not commit an authorization value.
- Do not read repository `.env` in inventory, download, or validation.
- Default private storage remains `<repo>/var/licensed-content/dautoeic`.
- Download requires an explicitly approved inventory SHA-256.
- Candidate import remains the only Reading source command that needs database configuration.

---

### Task 1: Public profile and CLI argument boundary

**Files:**
- Create: `apps/api/scripts/reading/source/reading-source.profile.json`
- Create: `apps/api/scripts/reading/source/reading-source.cli.test.ts`
- Modify: `apps/api/scripts/reading/source/reading-source.cli.ts`

**Interfaces:**
- Produces `loadReadingSourceRuntime({ argv, repositoryRoot })`.
- Resolves authorization from `--authorization=<value>` first, otherwise from `var/licensed-content/dautoeic/source-authorization.txt`.
- Resolves `--approved-sha=<64 lowercase hex>` only for download.

- [ ] Write tests proving operation without environment variables, private-file fallback, CLI precedence, checksum validation, and bounded numeric options.
- [ ] Run the new test and verify RED because the runtime loader does not exist.
- [ ] Add the public JSON profile and minimal parser/loader.
- [ ] Run the new test and verify GREEN.

### Task 2: Convert operator commands and package scripts

**Files:**
- Modify: `apps/api/scripts/reading/source/inventory-reading-source.ts`
- Modify: `apps/api/scripts/reading/source/download-reading-source.ts`
- Modify: `apps/api/scripts/reading/source/validate-reading-source.ts`
- Modify: `apps/api/scripts/reading/source/reading-source-command-boundary.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Inventory: `pnpm --filter @repo/api data:inventory-reading-source --authorization=<value>`
- Download: `pnpm --filter @repo/api data:download-reading-source --authorization=<value> --approved-sha=<sha>`
- Validate: `pnpm --filter @repo/api data:validate-reading-source`
- Import remains `dotenv -e ../../.env -- ...`.

- [ ] Extend command-boundary tests to reject `dotenv` and `process.env` from the three non-DB commands.
- [ ] Run tests and verify RED against current package scripts.
- [ ] Compose all three commands through `loadReadingSourceRuntime`.
- [ ] Remove `dotenv` from the three package scripts only.
- [ ] Run command and source tests and verify GREEN.

### Task 3: Verification and handoff

**Files:**
- Modify only if verification exposes a defect in Task 1 or Task 2.

- [ ] Run all Reading source tests.
- [ ] Run API typecheck and lint.
- [ ] Run `git diff --check` and scan tracked files for authorization values.
- [ ] Confirm no network download, database import, or migration was executed during implementation.
- [ ] Commit as `refactor(api): run Reading acquisition without env`.
