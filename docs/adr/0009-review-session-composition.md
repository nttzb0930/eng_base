# 0009 Review Session Composition

## Status

Accepted

## Context

Saved-word review can generate several local challenge types from the same
vocabulary item:

- `SELECT`: English to Vietnamese meaning.
- `ASSIST`: Vietnamese meaning to English word.
- `LISTEN_SELECT`: audio to English word, when audio exists.
- `FILL_BLANK`: example sentence context to English word, when a usable example
  exists.

Generating every possible challenge for every saved word makes review sessions
too long and repetitive.

## Decision

Each saved word always generates the two core direction checks:

- `SELECT`
- `ASSIST`

If enhanced data exists, the review generator adds at most one random enhanced
challenge:

- `LISTEN_SELECT` when `audioUrl` exists.
- `FILL_BLANK` when an example sentence contains the target word or a basic
  inflected form.

`FILL_BLANK` examples are selected randomly from `vocabulary_examples` and fall
back to `vocabulary_items.example_en` when the examples table has not been
backfilled yet.

## Consequences

- Review sessions stay shorter and less predictable.
- Extra enrichment data improves the review experience without changing seeded
  lesson challenges.
- `FILL_BLANK` can use forms such as `word`, `words`, `worded`, `wording`, and
  common `-e`/`-y` variants.
