# Learner Data Truthfulness Master Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the eight approved Phase 1 slices in dependency order so learner UI state is backed by typed server data before Reading, Writing, personalized planning, or AI work begins.

**Architecture:** Each slice has its own executable plan and merge gate. Topic progress is the central predecessor for Topic Practice, Flashcard Topic decks, and later personalized planning; migration deployment is an operational prerequisite for CEFR production use; Certificate remains a decision gate rather than speculative code.

**Tech Stack:** TypeScript 6, NestJS 11, Prisma 7/PostgreSQL, Next.js 16, React Query, next-intl, Node test runner, Turbo, GitHub Actions.

## Global Constraints

- Work begins from a clean, synchronized `develop`.
- Create one feature branch or worktree per implementation plan.
- Use `@repo/shared` root exports for cross-runtime contracts.
- API capabilities own business state; Web views do not infer learner state by index.
- Write a failing test before every behavioral change.
- Do not run `db:push`, migration reset, seed, vocabulary synchronization, or AI provider commands.
- Migration deployment requires explicit environment approval.
- Every merged slice must pass `pnpm architecture:check`, `pnpm test`, `pnpm check-types`, `pnpm lint`, and relevant production builds.

---

## Dependency Graph

```text
P1 Unit CEFR deployment

P2 Topic progress truth
 ├── P3 Topic Practice backend
 └── P4 Flashcard summary and Topic decks

P5 Certificate decision (independent decision gate)
P6 Onboarding constants and validation (independent)
P7 Localization completion (consume copy introduced by P2-P4)
P8 Dashboard streak (independent)

P2 + P3 + P4 + P8
 └── future Personalized Review plan
```

## Plan Index

| Order | Plan                                            | Deliverable                                   | Dependency                             |
| ----- | ----------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| 1     | `2026-07-24-unit-cefr-migration-deployment.md`  | Reviewed target-environment migration runbook | Existing migration and published image |
| 2     | `2026-07-24-topic-progress-truth.md`            | Server-owned Topic counts and item status     | None                                   |
| 3     | `2026-07-24-topic-practice-backend.md`          | Backend-generated Topic challenges            | Topic progress plan                    |
| 4     | `2026-07-24-flashcard-deck-summary.md`          | Real deck metrics and Topic deck sessions     | Topic identity/progress                |
| 5     | `2026-07-24-certificate-domain-decision.md`     | Accepted Certificate ADR                      | Product decision                       |
| 6     | `2026-07-24-onboarding-constants-validation.md` | Shared options and strict DTO validation      | None                                   |
| 7     | `2026-07-24-localization-completion.md`         | Catalog parity and no hard-coded learner copy | P2-P4 UI stabilized                    |
| 8     | `2026-07-24-dashboard-streak.md`                | Deterministic UTC streak contract             | None                                   |

## Merge Checkpoints

- [ ] **Checkpoint A: Establish the baseline**

Run:

```powershell
git status --short
git rev-list --left-right --count develop...origin/develop
pnpm architecture:check
pnpm test
```

Expected: clean status, `0 0`, and all checks exit zero.

- [ ] **Checkpoint B: Merge Topic truth before consumers**

Complete `2026-07-24-topic-progress-truth.md`, merge it, and rerun the baseline gates. Do not start Topic Practice or Flashcard Topic deck implementation from the pre-Topic branch.

- [ ] **Checkpoint C: Run Topic consumers independently**

Create separate branches from the verified Topic-progress baseline for:

```text
feature/topic-practice-backend
feature/flashcard-topic-decks
```

Merge each only after its focused API/Web tests and workspace gates pass.

- [ ] **Checkpoint D: Complete independent safety work**

Onboarding validation and Dashboard streak may be developed independently from the Topic consumer branches. Localization completion starts after Topic and Flashcard UI shapes stop changing.

- [ ] **Checkpoint E: Resolve Certificate before Certificate code**

Complete and accept the ADR from `2026-07-24-certificate-domain-decision.md`. Remove fictional Certificate metrics from UI even if the product decision defers Certificate implementation.

- [ ] **Checkpoint F: Deploy migration separately**

Execute `2026-07-24-unit-cefr-migration-deployment.md` only with the target environment, image tag, backup policy, and authorized operator confirmed. A code merge does not imply production migration approval.

- [ ] **Checkpoint G: Phase 1 exit gate**

Run:

```powershell
pnpm db:generate
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
git diff --check
git status --short
```

Expected: every command exits zero, no generated source artifact is tracked, and Git status is clean.

Verify manually:

1. Reordering Topic items does not change weak/mastered status.
2. Topic Practice network responses contain server-generated options.
3. Flashcard Topic sessions reject an unknown slug.
4. Invalid onboarding IDs return HTTP 400.
5. `/en` and `/vi` primary routes emit no `MISSING_MESSAGE`.
6. Dashboard and Learn display the same streak.

## Phase 1 Exit Criteria

- No learner status is assigned from array index.
- No challenge or distractor is created in a learner view.
- Flashcard percentages, availability, and timestamps come from the API.
- Certificate UI exposes no fictional progress.
- Onboarding values are shared and server-validated.
- Primary learner routes have catalog-backed presentation copy.
- Streak is deterministic and server-owned.
- Target CEFR migration state is documented per environment.
