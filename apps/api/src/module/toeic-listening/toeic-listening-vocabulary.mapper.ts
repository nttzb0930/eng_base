import type { ToeicListeningVocabularySuggestion } from "@repo/shared";
import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable().optional();
const pairSchema = z.object({
  en: z.string().trim().min(1),
  vi: z.string().trim().min(1),
});
const vocabularySchema = z.array(
  z
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
    .passthrough()
);

export function mapToeicListeningVocabulary(
  value: unknown
): ToeicListeningVocabularySuggestion[] {
  return vocabularySchema.parse(value).map((item) => ({
    word: item.word,
    lemma: item.lemma ?? null,
    pos: item.pos,
    meaningVi: item.meaning_vi,
    cefrLevel: item.cefr,
    ipaUs: item.ipa_us ?? null,
    ipaUk: item.ipa_uk ?? null,
    exampleEn: item.example_en ?? null,
    exampleVi: item.example_vi ?? null,
    collocations: item.collocations,
    synonym: item.synonym ?? null,
  }));
}
