# ADR 0020: Make Learning Progress Writes Idempotent and Concurrent-Safe

## Status

Accepted

## Context

Repeated challenge-completion requests could award points more than once even
though challenge identity was unique. Vocabulary review flows also performed a
read, calculated counters in memory, and wrote absolute values, allowing two
concurrent attempts to overwrite one another. Topic listing queried vocabulary
once per topic.

## Decision

- Completing a Lesson challenge awards points only when its unique
  `(user_id, challenge_id)` progress identity is inserted. Repeated or
  concurrent requests return an idempotent completed result without points.
- Vocabulary exposes four flat goal use cases. The former aggregate
  `VocabularyService` and its no-op revalidation method are removed.
- Vocabulary review scheduling is a pure internal rule. Progress writes run in
  a serializable transaction, take a PostgreSQL transaction advisory lock for
  the Learner and Vocabulary item identity, and use atomic counter increments.
- Topic listing loads Topic relations and Vocabulary items in batches; query
  count does not grow with the number of Topics.
- Reverse-proxy trust is explicit through `TRUST_PROXY_HOPS`, defaulting to zero
  so forwarded client IP headers are ignored unless deployment opts in.

## Consequences

- Retry and double-click behavior cannot farm Lesson points.
- Concurrent review attempts are preserved and scheduling changes have
  Locality behind one rule.
- Vocabulary delivery calls goal Interfaces directly without a compatibility
  facade.
- Topic reads avoid the prior N+1 query pattern.
- Deployments behind a known proxy must configure its exact hop count so rate
  limiting sees the client IP.
