# CI Verification Repair Design

## Goal

Restore the existing GitHub Actions verification pipeline without changing application behavior or vocabulary data.

## Confirmed failures

- Consumer jobs start from clean checkouts, while `@repo/shared` and `@repo/ui` export only generated files under `dist/`.
- The successful `Packages` job does not make its generated files available to the isolated API, Web, or Admin jobs.
- The vocabulary architecture test still asserts the retired 3,000-entry baseline even though the canonical catalog contains 7,429 entries.
- Four checked Markdown plans do not match the repository Prettier configuration.

## Design

Keep the workflow explicit and local to each consumer job:

- API builds `@repo/shared` before running API verification.
- Web and Admin build both `@repo/shared` and `@repo/ui` before running their verification commands.
- The Packages job remains the package-owned test and build gate. No artifact upload/download layer is introduced because these packages are small and deterministic.

Update the vocabulary architecture invariant from 3,000 to 7,429. The older normalization and POS-correction scripts keep their 3,000-record guards because they describe historical, destructive data workflows and are outside this CI repair.

Format only the Markdown files reported by the existing repository check.

## Failure handling

Every consuming job must fail immediately if a workspace dependency cannot build. Application tests, type checking, linting, and application builds continue to run in their existing order after dependencies are available.

## Verification

- Run the vocabulary architecture test before and after the count change to establish red/green behavior.
- Remove generated package output in an isolated temporary copy, then run the same workspace-build and consumer verification sequence used by CI.
- Run API, Web, and Admin verification commands relevant to the changed workflow.
- Run the exact repository Prettier check.
- Validate workflow architecture tests and inspect the final diff.

## Non-goals

- No database migration, seed, or vocabulary rewrite.
- No changes to application UI or runtime APIs.
- No refactor of historical 3,000-record normalization and POS-correction workflows.
- No GitHub Actions artifact caching redesign.
