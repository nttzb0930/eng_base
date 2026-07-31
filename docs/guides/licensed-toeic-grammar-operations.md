# Licensed TOEIC Grammar Operations

This workflow inventories, downloads, validates, and imports only Grammar
content that the configured source identity is permitted to read. API
accessibility does not grant a redistribution license; confirm content rights
before publishing imported material.

## Private credentials

Store the public source API key and short-lived user access token as one line
in these ignored files:

```text
var/licensed-content/dautoeic/source-authorization.txt
var/licensed-content/dautoeic/source-user-access-token.txt
```

The token file accepts either a raw JWT or `Bearer <JWT>`. Never pass either
credential on the command line, commit it, or paste it into logs. Refresh an
expired user token before inventory or download.

## 1. Inventory

```powershell
pnpm --filter @repo/api data:inventory-toeic-grammar
```

The command reads visible topics/subtopics, mixed sets, and authenticated
difficulty levels 1–5. It writes a content-addressed inventory under:

```text
var/licensed-content/dautoeic/inventories/toeic-grammar/
```

Review the counts and copy the exact `inventorySha256`.

## 2. Download an approved inventory

```powershell
pnpm --filter @repo/api data:download-toeic-grammar -- --approved-sha=REVIEWED_64_CHARACTER_SHA256
```

The command resumes checkpoints, deduplicates questions shared by several
views, and writes `content.json`, `validation.json`, then `manifest.json` under
`var/licensed-content/dautoeic/toeic-grammar/<inventorySha256>/`.

## 3. Validate offline

```powershell
pnpm --filter @repo/api data:validate-toeic-grammar
```

Validation does not access the source or database. It checks answer keys,
references, memberships, levels, identities, and checksums.

## 4. Apply schema and import

These are the only database-changing operations:

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-toeic-grammar -- --approved-sha=REVIEWED_64_CHARACTER_SHA256
```

Importing the active checksum returns `SKIPPED`. A new approved checksum
replaces all Dautoeic-owned Grammar rows atomically and activates the new
snapshot last. A failure rolls back the transaction. The importer does not
create learner progress, call AI, or publish a learner UI.
