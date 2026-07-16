import type { VocabularyItem } from "../types/vocabulary.types";

export type ReviewSourceItem = Pick<
  VocabularyItem,
  "id" | "word" | "pos" | "cefrLevel" | "primaryMeaningVi" | "meaningVi"
>;

type BlankSourceItem = Pick<VocabularyItem, "word" | "exampleEn"> & {
  vocabularyExamples: ReadonlyArray<{ exampleEn: string }>;
};

type RandomSource = () => number;

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  return [...items].sort(() => random() - 0.5);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getWordForms(word: string): string[] {
  const lowerWord = word.toLowerCase();
  const forms = new Set([lowerWord, `${lowerWord}s`, `${lowerWord}ed`]);

  if (lowerWord.endsWith("e")) {
    forms.add(`${lowerWord}d`);
    forms.add(`${lowerWord.slice(0, -1)}ing`);
  } else {
    forms.add(`${lowerWord}ing`);
  }

  if (lowerWord.endsWith("y") && lowerWord.length > 1) {
    forms.add(`${lowerWord.slice(0, -1)}ies`);
    forms.add(`${lowerWord.slice(0, -1)}ied`);
  }

  return [...forms].sort((a, b) => b.length - a.length);
}

function getWordFormPattern(word: string): RegExp {
  const alternatives = getWordForms(word).map(escapeRegExp).join("|");
  return new RegExp(`\\b(${alternatives})\\b`, "i");
}

export function getBlankedExample(
  item: BlankSourceItem,
  random: RandomSource = Math.random
): string | null {
  const examples =
    item.vocabularyExamples.length > 0
      ? item.vocabularyExamples.map((example) => example.exampleEn)
      : item.exampleEn
        ? [item.exampleEn]
        : [];
  const wordPattern = getWordFormPattern(item.word);
  const example = shuffle(examples, random).find((candidate) =>
    wordPattern.test(candidate)
  );

  return example ? example.replace(wordPattern, "_____") : null;
}

export function toReviewSourceItem(item: VocabularyItem): ReviewSourceItem {
  return {
    id: item.id,
    word: item.word,
    pos: item.pos,
    cefrLevel: item.cefrLevel,
    primaryMeaningVi: item.primaryMeaningVi,
    meaningVi: item.meaningVi,
  };
}

function hasMeaningOverlap(
  target: ReviewSourceItem,
  candidate: ReviewSourceItem
): boolean {
  const targetPrimary = target.primaryMeaningVi.toLowerCase();
  const candidatePrimary = candidate.primaryMeaningVi.toLowerCase();
  const targetMeaning = target.meaningVi.toLowerCase();
  const candidateMeaning = candidate.meaningVi.toLowerCase();

  return (
    targetMeaning.includes(candidatePrimary) ||
    candidateMeaning.includes(targetPrimary)
  );
}

export function getDistractors(
  target: ReviewSourceItem,
  pool: readonly ReviewSourceItem[],
  count = 3,
  random: RandomSource = Math.random
): ReviewSourceItem[] {
  const cleanPool = pool.filter(
    (item) =>
      item.id !== target.id &&
      item.word !== target.word &&
      item.primaryMeaningVi !== target.primaryMeaningVi &&
      !hasMeaningOverlap(target, item)
  );
  const strategies = [
    (item: ReviewSourceItem) =>
      item.cefrLevel === target.cefrLevel && item.pos === target.pos,
    (item: ReviewSourceItem) => item.cefrLevel === target.cefrLevel,
    (item: ReviewSourceItem) => item.pos === target.pos,
    () => true,
  ];
  const selected: ReviewSourceItem[] = [];

  for (const strategy of strategies) {
    const candidates = shuffle(
      cleanPool.filter(
        (item) =>
          strategy(item) &&
          !selected.some((selectedItem) => selectedItem.id === item.id)
      ),
      random
    );

    for (const candidate of candidates) {
      selected.push(candidate);
      if (selected.length === count) return selected;
    }
  }

  return selected;
}
