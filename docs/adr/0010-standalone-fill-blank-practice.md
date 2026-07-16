# 0010 Standalone Fill-Blank Practice

## Status

Accepted

## Context

`FILL_BLANK` originally lived only inside saved-word review. That required the
learner to save words before trying contextual practice, which makes demos and
exploration slower.

## Decision

Add a standalone practice route:

```txt
/practice/fill-blank
```

The route generates local `FILL_BLANK` challenges from all vocabulary items that
have usable examples. It does not require the word to be saved first.

After answering, the learner sees the vocabulary card and can save the word.
Practice results still update `user_vocabulary_progress`, even when the word is
not saved.

## Consequences

- Learners can immediately practice vocabulary in sentence context.
- Saved words remain useful for spaced review, but are no longer required for
  trying the fill-blank mode.
- The route depends on example enrichment data in `vocabulary_examples` or
  `vocabulary_items.example_en`.
