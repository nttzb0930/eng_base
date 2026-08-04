# TOEIC Import Transaction Budget

## Problem

The TOEIC Reading and Listening importers replace one complete test inside a
Prisma interactive transaction. When the importer runs locally against the
production database through an SSH tunnel, the per-row writes exceed Prisma's
default five-second transaction timeout. Imports then fail with `P2028`; later
nested writes may surface as `P2003` after the transaction is no longer usable.

## Design

Keep the existing transaction boundary of one transaction per source test so
partial tests can never be published. Pass an explicit transaction budget of
`maxWait: 10_000` and `timeout: 120_000` to the Reading and Listening Prisma
stores. Do not change validation, source packages, publication behavior, or
database schema.

The timeout is intentionally local to the offline importers. It must not alter
API request transactions or global Prisma configuration.

## Failure behavior

If a test still exceeds the explicit budget, that test remains rolled back and
is reported in the import summary. Other source tests continue to be attempted.
Temporary diagnostic logging added during investigation must be removed after
verification.

## Verification

- Store unit tests assert that the interactive transaction receives the
  explicit `maxWait` and `timeout` values.
- Existing Reading and Listening importer tests remain green.
- API lint and type checking pass for the changed files.
- The original Reading import is rerun through the SSH tunnel and completes
  without `P2028` or `P2003`.

## Deferred optimization

Bulk insertion with `createMany` may be added later if production imports remain
slow. It is outside this fix because it changes write orchestration and requires
broader identity-mapping tests.
