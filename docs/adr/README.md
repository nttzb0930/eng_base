# Architecture Decision Records

Architecture Decision Records (ADRs) explain durable choices that constrain
future implementation. Read the ADRs related to a capability before changing
its ownership, public interface, persistence model, or compatibility behavior.

## Status vocabulary

- **Accepted**: the decision is active.
- **Superseded**: a newer ADR replaced the decision; retain the file only as
  historical context.
- **Amended**: the decision remains active except for the parts explicitly
  changed by a newer ADR or canonical workflow.

When ADRs overlap, the newer accepted decision wins only for the scope it
explicitly amends. Architecture documents describe the resulting current state.

## Decision catalog

| ADR                                                         | Decision                                                       | Status and relationship                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [0001](0001-use-prisma-postgres.md)                         | Use Prisma with PostgreSQL                                     | Accepted; source layout amended by ADR 0014                                 |
| [0002](0002-english-vocabulary-phase1.md)                   | Seed English vocabulary as the initial catalog                 | Accepted; data-source details amended by the canonical vocabulary pipeline  |
| [0003](0003-saved-words-review-local-session.md)            | Start saved-word review as a local session                     | Superseded by ADR 0004                                                      |
| [0004](0004-persistent-vocabulary-progress.md)              | Persist vocabulary progress                                    | Accepted; supersedes ADR 0003                                               |
| [0005](0005-spaced-review-ui.md)                            | Add spaced-review UI before advanced scheduling                | Accepted                                                                    |
| [0006](0006-audio-enrichment.md)                            | Store pronunciation audio on vocabulary items                  | Accepted                                                                    |
| [0007](0007-listening-review-local-challenges.md)           | Generate listening challenges without persisted lesson types   | Accepted                                                                    |
| [0008](0008-example-sentence-enrichment.md)                 | Store example sentences on vocabulary items                    | Accepted                                                                    |
| [0009](0009-review-session-composition.md)                  | Compose core and enhanced review challenges                    | Accepted                                                                    |
| [0010](0010-standalone-fill-blank-practice.md)              | Provide standalone fill-blank practice                         | Accepted                                                                    |
| [0011](0011-monorepo-runtime-ownership.md)                  | Split Web, Admin, and API runtimes                             | Accepted                                                                    |
| [0012](0012-course-content-capability-boundary.md)          | Keep Course Content under one capability boundary              | Accepted; amended by ADRs 0013, 0016, and 0021                              |
| [0013](0013-frontend-feature-view-profile.md)               | Use feature ownership with route-level views                   | Accepted; amends the frontend layout in ADR 0012                            |
| [0014](0014-capability-owned-api-source-profile.md)         | Use a capability-owned API source layout                       | Accepted; amends ADR 0001 and is refined by ADRs 0015 and 0016              |
| [0015](0015-auth-use-case-organization.md)                  | Organize authentication by use case                            | Accepted; refines Auth placement in ADR 0014                                |
| [0016](0016-domain-owner-locality.md)                       | Keep Admin delivery and supporting roles with the domain owner | Accepted; refines ADRs 0012 and 0014                                        |
| [0017](0017-centralized-http-logging.md)                    | Centralize HTTP logging and exception mapping                  | Accepted                                                                    |
| [0018](0018-flat-goal-use-cases-and-explicit-list-query.md) | Use flat goal use cases and explicit list queries              | Accepted                                                                    |
| [0019](0019-auth-endpoint-rate-limiting.md)                 | Rate-limit authentication at the HTTP seam                     | Accepted; builds on ADRs 0015 and 0017                                      |
| [0020](0020-idempotent-learning-progress.md)                | Make learning progress writes idempotent and concurrent-safe   | Accepted                                                                    |
| [0021](0021-shared-typescript-root-interface.md)            | Expose Shared TypeScript through one root interface            | Accepted; supersedes Shared naming and export details in ADRs 0012 and 0013 |

## Creating a decision record

Use the next four-digit number and a short kebab-case filename. Every ADR must
contain exactly these top-level sections after its title:

1. `Status`
2. `Context`
3. `Decision`
4. `Consequences`

State amendments and supersession in both the new ADR and this catalog. Do not
use an external project, private conversation, prototype, or implementation
plan as required context; a decision record must be understandable from this
repository alone.
