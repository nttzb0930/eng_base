# Topic Expansion Worker Queue Design

**Goal:** Generate topic expansion artifacts faster across many vocabulary topics while keeping generation inside each topic sequential to prevent duplicate words.

**Decision:** Keep `data:generate-topic-expansion` as the safe single-topic runner. Add a separate queue runner that reads topic deficits, creates topic jobs, and runs multiple workers where each worker owns one topic at a time. A worker processes chunks sequentially for its topic.

**Concurrency model:**

- Parallelism is across topics only.
- Chunks within one topic are generated in order.
- Each chunk excludes catalog words, pending artifacts, and words generated earlier in the same topic run.
- The queue runner skips topics with no deficit.
- The queue runner limits work per topic per run using `--chunks-per-topic`.

**Command shape:**

```bash
pnpm --filter @repo/api data:generate-topic-expansion-queue -- --workers 3 --chunk-size 5 --chunks-per-topic 10
```

**Artifacts:** The runner writes the same review chunk artifacts used by the single-topic runner:

```txt
data/vocabulary/working/topic-expansion/<topic-slug>/chunk-001.json
```

**Safety constraints:**

- No database writes.
- No provider call when there are no deficient topics.
- No logging API keys, prompts, raw AI responses, cookies, or DB credentials.
- Default worker count is conservative.
- Same-topic concurrency is not allowed.
