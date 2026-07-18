# English Base Documentation

This index is the entry point for current English Base documentation. Read the
smallest canonical document that owns the subject you are changing; do not use
completed implementation plans or UI prototypes as current guidance.

## Start here

1. Read [`CONTEXT.md`](../CONTEXT.md) for domain language and stable
   compatibility constraints.
2. Read [`AGENTS.md`](../AGENTS.md) for mandatory workflow and safety rules.
3. Read the relevant architecture, data, or decision document below before
   changing a public Interface or ownership rule.

## Canonical ownership

Knowledge has the following precedence:

1. `CONTEXT.md` owns domain language and product invariants.
2. A newer accepted ADR owns a durable decision and explicitly amends or
   supersedes older decisions.
3. `docs/architecture/` and `docs/data/` describe the resulting current state.
4. Development guides own repeatable commands.
5. `AGENTS.md` and the root README summarize guardrails and link to the owner.

When two active documents disagree, correct the stale document in the same
change. Do not preserve contradictory rules as temporary alternatives.

## Architecture

- [Codebase structure](architecture/codebase-structure.md): workspace ownership,
  dependency direction, type placement, naming, and forbidden technical buckets.
- [Frontend folder structure](frontend-folder-structure.md): current Web/Admin
  feature and view placement.
- [Frontend/API integration](frontend-api-calls.md): browser resource APIs,
  query keys, wire types, and compatibility behavior.
- [Backend folder structure](backend-folder-structure.md): API source roots,
  capability Modules, Prisma ownership, and safety.
- [Course content](architecture/course-content.md): worked capability example
  covering Course Management across API, Admin, and Shared.

## Development guides

The root [`README.md`](../README.md) contains the safe quick start. Commands that
write schema, data, or provider output require the workflow owner and explicit
approval; a successful compile or architecture check never requires a database
write.

## Data workflows

- [Vocabulary data pipeline](data/vocabulary-pipeline.md): canonical inputs,
  generated artifacts, classification, expansion, seed safety, and review gates.

## Architecture decision records

The [`adr/`](adr/) directory records why durable decisions exist. A decision
record explains context and trade-offs; it is not a folder template or an
operating guide. Newer ADRs must state which earlier decision they amend or
supersede.

## Historical material

Git history is the archive for completed implementation plans, superseded
handoffs, and UI prototypes. Historical files are removed from the active
documentation tree after their accepted rules are incorporated into canonical
documents, so repository search returns current guidance by default.
