import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable().optional();
const pairSchema = z.object({
  en: z.string().trim().min(1),
  vi: z.string().trim().min(1),
});
const itemSchema = z
  .object({
    word: z.string().trim().min(1),
    lemma: optionalText,
    pos: z.string().trim().min(1),
    cefr: z.string().trim().min(1),
    ipa_us: optionalText,
    ipa_uk: optionalText,
    meaning_vi: z.string().trim().min(1),
    example_en: optionalText,
    example_vi: optionalText,
    collocations: z.array(pairSchema).optional().default([]),
    synonym: pairSchema.nullable().optional(),
  })
  .passthrough();
const inventorySchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("dautoeic"),
    inventorySha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceTestIds: z.array(z.string().min(1)).min(1),
    entries: z.record(z.string().min(1), z.array(itemSchema)),
  })
  .passthrough();

export type ToeicVocabularyCacheImportInput = {
  source: "dautoeic";
  sourceTestIds: string[];
  inventorySha256: string;
  entries: Record<string, Array<Record<string, unknown>>>;
};

export interface ToeicVocabularyCacheImportStore {
  replace(
    input: ToeicVocabularyCacheImportInput
  ): Promise<"UPDATED" | "SKIPPED">;
}

export async function importToeicVocabularyCache(
  value: unknown,
  store: ToeicVocabularyCacheImportStore
) {
  const inventory = inventorySchema.parse(value);
  return store.replace({
    source: inventory.source,
    sourceTestIds: [...new Set(inventory.sourceTestIds)].sort(),
    inventorySha256: inventory.inventorySha256,
    entries: inventory.entries,
  });
}
