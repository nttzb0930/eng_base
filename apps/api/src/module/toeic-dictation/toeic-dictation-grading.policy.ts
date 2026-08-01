export type ToeicDictationWordStatus = "CORRECT" | "MISSING" | "EXTRA";

export type ToeicDictationWordResult = {
  status: ToeicDictationWordStatus;
  expected: string | null;
  actual: string | null;
};

export type ToeicDictationGrade = {
  wordsCorrect: number;
  totalWords: number;
  accuracy: number;
  mastered: boolean;
  words: ToeicDictationWordResult[];
};

export function normalizeDictationText(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function alignWords(expected: string[], actual: string[]) {
  const rows = expected.length + 1;
  const columns = actual.length + 1;
  const matrix = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(0),
  );

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      matrix[row]![column] = expected[row - 1] === actual[column - 1]
        ? matrix[row - 1]![column - 1]! + 1
        : Math.max(matrix[row - 1]![column]!, matrix[row]![column - 1]!);
    }
  }

  const result: ToeicDictationWordResult[] = [];
  let row = expected.length;
  let column = actual.length;
  while (row > 0 || column > 0) {
    if (
      row > 0 &&
      column > 0 &&
      expected[row - 1] === actual[column - 1]
    ) {
      result.push({
        status: "CORRECT",
        expected: expected[row - 1]!,
        actual: actual[column - 1]!,
      });
      row -= 1;
      column -= 1;
    } else if (
      row > 0 &&
      (column === 0 || matrix[row - 1]![column]! >= matrix[row]![column - 1]!)
    ) {
      result.push({
        status: "MISSING",
        expected: expected[row - 1]!,
        actual: null,
      });
      row -= 1;
    } else {
      result.push({
        status: "EXTRA",
        expected: null,
        actual: actual[column - 1]!,
      });
      column -= 1;
    }
  }
  return result.reverse();
}

export function gradeToeicDictation(
  expectedText: string,
  actualText: string,
): ToeicDictationGrade {
  const expected = normalizeDictationText(expectedText);
  const actual = normalizeDictationText(actualText);
  const words = alignWords(expected, actual);
  const wordsCorrect = words.filter((word) => word.status === "CORRECT").length;
  const totalWords = expected.length;
  const accuracy = totalWords === 0
    ? 0
    : Math.round((wordsCorrect / totalWords) * 100);
  return {
    wordsCorrect,
    totalWords,
    accuracy,
    mastered: accuracy >= 90 && totalWords > 0,
    words,
  };
}
