import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";

export type VocabularyTextMatch = {
  id: number;
  word: string;
  phonetic: string | null;
  pos: string;
  meaningVi: string;
  cefrLevel: string;
};

@Injectable()
export class FindVocabularyInTextUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(text: string, limit = 8): Promise<VocabularyTextMatch[]> {
    const candidates = buildVocabularyCandidates(text);
    if (candidates.length === 0 || limit <= 0) return [];

    const items = await this.prisma.vocabulary_items.findMany({
      where: { normalized_word: { in: candidates } },
      select: {
        id: true,
        word: true,
        normalized_word: true,
        phonetic: true,
        pos: true,
        meaning_vi: true,
        cefr_level: true,
      },
    });
    const candidateOrder = new Map(
      candidates.map((candidate, index) => [candidate, index])
    );
    return items
      .sort(
        (left, right) =>
          (candidateOrder.get(left.normalized_word) ??
            Number.MAX_SAFE_INTEGER) -
          (candidateOrder.get(right.normalized_word) ?? Number.MAX_SAFE_INTEGER)
      )
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        word: item.word,
        phonetic: item.phonetic,
        pos: item.pos,
        meaningVi: item.meaning_vi,
        cefrLevel: item.cefr_level,
      }));
  }
}

function buildVocabularyCandidates(text: string) {
  const words = (
    text.toLocaleLowerCase("en-US").match(/[a-z]+(?:'[a-z]+)*/gu) ?? []
  )
    .map((word) => word.replace(/'s$/u, ""))
    .filter((word) => word.length >= 2);
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (let size = 3; size >= 1; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const candidate = words.slice(index, index + size).join(" ");
      if (!seen.has(candidate)) {
        seen.add(candidate);
        candidates.push(candidate);
      }
    }
  }
  return candidates.slice(0, 500);
}
