# Topic Candidate Queues Design

**Goal:** Run candidate generation and candidate review across all topics without mixing both stages in one command.

**Decision:** Add two separate queues:

```powershell
pnpm --filter @repo/api data:generate-topic-candidates-queue -- --workers 3 --count 20
pnpm --filter @repo/api data:review-topic-candidates-queue -- --workers 3
```

**Stage separation:**

1. Generate candidates for every topic in taxonomy order.
2. Review generated candidate chunks for every topic.
3. Human spot-check several topic artifacts.
4. Enrich accepted candidates later.

**Safety constraints:**

- No catalog writes.
- No database writes.
- Queues only touch ignored working artifacts.
- Workers run different topics in parallel.
- One topic is processed sequentially within a worker.
