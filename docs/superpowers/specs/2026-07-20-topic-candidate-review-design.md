# Topic Candidate Review Design

**Goal:** Add an AI review pass that filters generated topic candidates before human review and enrichment.

**Flow:**

1. `data:generate-topic-candidates` writes raw candidate artifacts.
2. `data:review-topic-candidates` reads one chunk or all chunks for a topic.
3. AI reviewer classifies each candidate as:
   - `core`
   - `supporting`
   - `reject`
4. The script keeps only `core` candidates in `candidates`.
5. The script moves `supporting` and `reject` candidates to `rejected` with stable reasons.

**Command shape:**

```powershell
pnpm --filter @repo/api data:review-topic-candidates -- friends --all
pnpm --filter @repo/api data:review-topic-candidates -- friends --chunk chunk-002.json
```

**Safety constraints:**

- No catalog writes.
- No database writes.
- Do not log provider keys, raw provider responses, prompts, cookies, or DB credentials.
- Reviewer updates only ignored working candidate artifacts.
