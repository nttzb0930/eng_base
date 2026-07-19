# Topic Candidate Expansion Design

**Goal:** Reduce duplicate/full-JSON failures by splitting Topic expansion into candidate generation and later enrichment.

**Pipeline:**

1. Phase A generates candidate words only for a topic.
2. Phase B validates and deduplicates candidates against the catalog and prior candidate artifacts.
3. Human review accepts candidate artifacts.
4. Later enrichment expands accepted candidates into full vocabulary records with examples/audio.

**Artifact location:**

```txt
data/vocabulary/working/topic-candidates/<topic-slug>/chunk-001.json
```

**Artifact shape:**

```json
{
  "schemaVersion": 1,
  "status": "review",
  "targetTopicSlug": "friends",
  "requestedCount": 50,
  "generatedAt": "2026-07-20T00:00:00.000Z",
  "candidates": [{ "word": "companion", "pos": "noun", "cefrLevel": "B1" }],
  "rejected": [
    {
      "word": "dependable",
      "pos": "adjective",
      "cefrLevel": "B2",
      "reason": "catalog-duplicate"
    }
  ]
}
```

**Safety constraints:**

- Candidate generation does not write the canonical catalog or database.
- Candidate validation removes duplicates instead of failing the whole run.
- Accepted candidate enrichment is a separate explicit step.
- Logs never include API keys, prompts, raw provider responses, cookies, or database credentials.
