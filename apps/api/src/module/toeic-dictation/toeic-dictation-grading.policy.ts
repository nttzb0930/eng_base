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

type TranscriptToken = {
  text: string;
  wordIndex: number | null;
};

export type ToeicDictationCheckSegment = {
  segmentIndex: number;
  wordIndex: number | null;
  text: string | null;
  hidden: boolean;
};

function tokenizeTranscript(value: string): TranscriptToken[] {
  const tokens = value.match(/[\p{L}\p{N}]+(?:['’\u2011-][\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+|\s+/gu) ?? [];
  let wordIndex = 0;
  return tokens.map((text) => {
    const isWord = /[\p{L}\p{N}]/u.test(text);
    const token = { text, wordIndex: isWord ? wordIndex : null };
    if (isWord) wordIndex += 1;
    return token;
  });
}

export function buildToeicDictationCheckSegments(
  transcript: string,
  itemId: number,
  hidePercent: 30 | 50 | 100,
): ToeicDictationCheckSegment[] {
  const tokens = tokenizeTranscript(transcript);
  const wordCount = tokens.filter((token) => token.wordIndex !== null).length;
  const hiddenCount = Math.max(1, Math.ceil((wordCount * hidePercent) / 100));
  const hiddenWords = new Set(
    Array.from({ length: wordCount }, (_, index) => ({
      index,
      rank: (index * 31 + itemId) % Math.max(wordCount, 1),
    }))
      .sort((left, right) => left.rank - right.rank)
      .slice(0, hiddenCount)
      .map((entry) => entry.index),
  );
  return tokens.map((token, segmentIndex) => {
    const hidden = token.wordIndex !== null && hiddenWords.has(token.wordIndex);
    return {
      segmentIndex,
      wordIndex: token.wordIndex,
      text: hidden ? null : token.text,
      hidden,
    };
  });
}

export function gradeToeicDictationCheck(
  transcript: string,
  typedText: string,
  itemId: number,
  hidePercent: 30 | 50 | 100,
): ToeicDictationGrade {
  const segments = buildToeicDictationCheckSegments(transcript, itemId, hidePercent);
  const expected = segments
    .filter((segment) => segment.hidden)
    .map((segment) => normalizeDictationText(tokenizeTranscript(transcript)[segment.segmentIndex]?.text ?? ""))
    .flat();
  const actual = normalizeDictationText(typedText);
  const words = alignWords(expected, actual);
  const wordsCorrect = words.filter((word) => word.status === "CORRECT").length;
  const totalWords = expected.length;
  const accuracy = totalWords === 0 ? 0 : Math.round((wordsCorrect / totalWords) * 100);
  return {
    wordsCorrect,
    totalWords,
    accuracy,
    mastered: accuracy >= 90 && totalWords > 0,
    words,
  };
}
