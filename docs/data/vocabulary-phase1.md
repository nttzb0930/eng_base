# Phase 1 Vocabulary Dataset

## Flow

1. Build clean JSON:

   ```bash
   npm run data:build-vocab
   ```

2. Push Prisma schema:

   ```bash
   npm run db:push
   ```

3. Seed database:

   ```bash
   npm run db:seed
   ```

## Outputs

- `data/vocabulary/phase1-vocabulary.json`
- `data/vocabulary/phase1-vocabulary-report.json`

## Required Fields

- `word`
- `normalizedWord`
- `pos`
- `cefrLevel`
- `meaningVi`
- `primaryMeaningVi`

## Optional Fields

- `posVi`
- `phonetic`
- `audioUrl`
- `audioSource`
- `exampleEn`
- `exampleVi`
- `exampleSource`

## Audio Enrichment

Pronunciation audio is enriched after seed:

```bash
npm run data:enrich-audio -- --limit all --concurrency 2 --request-delay-ms 750
```

The script updates `vocabulary_items.audio_url` and writes:

```txt
data/vocabulary/audio-enrichment-report.json
```

Example sentences are enriched after seed:

```bash
npm run data:enrich-examples -- --limit all --concurrency 2 --request-delay-ms 750 --examples-per-word all
```

The script stores all valid examples returned by the dictionary API in
`vocabulary_examples`, keeps the first example in `vocabulary_items.example_en`
for compatibility, and writes:

```txt
data/vocabulary/example-enrichment-report.json
```

Saved-word review can use these examples to generate local `FILL_BLANK`
challenges without changing the seeded lesson challenge enum.

## Quiz Generation

Each vocabulary item creates two challenges:

- `SELECT`: What does the English word mean?
- `ASSIST`: Which English word matches the Vietnamese meaning?

Distractors prefer the same CEFR level and same part of speech, then fall back to nearby levels and the clean pool.
