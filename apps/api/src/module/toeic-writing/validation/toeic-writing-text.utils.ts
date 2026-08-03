const WORD_PATTERN = /\p{L}+(?:['’-]\p{L}+)*/gu;

export function normalizeToeicWritingText(value: string): string {
  return value.normalize("NFKC").trim();
}

export function tokenizeToeicWritingWords(value: string): string[] {
  return normalizeToeicWritingText(value).match(WORD_PATTERN) ?? [];
}

export function countToeicWritingWords(value: string): number {
  const normalized = normalizeToeicWritingText(value);

  return normalized === "" ? 0 : normalized.split(/\s+/u).length;
}

function inflectionCandidates(keyword: string): Set<string> {
  const normalized = keyword.toLocaleLowerCase("en-US");
  const candidates = new Set([normalized]);

  if (normalized.endsWith("y") && !/[aeiou]y$/u.test(normalized)) {
    const stem = normalized.slice(0, -1);
    candidates.add(`${stem}ies`);
    candidates.add(`${stem}ied`);
  } else {
    candidates.add(`${normalized}s`);
    candidates.add(`${normalized}ed`);
  }

  if (/(?:s|x|z|ch|sh|o)$/u.test(normalized)) {
    candidates.add(`${normalized}es`);
  }

  if (normalized.endsWith("e")) {
    candidates.add(`${normalized.slice(0, -1)}ing`);
    candidates.add(`${normalized}d`);
  } else {
    candidates.add(`${normalized}ing`);
  }

  const cvcMatch = normalized.match(/^(.*)([^aeiou])([aeiou])([^aeiouwxy])$/u);
  if (cvcMatch) {
    const finalConsonant = cvcMatch[4];
    candidates.add(`${normalized}${finalConsonant}ing`);
    candidates.add(`${normalized}${finalConsonant}ed`);
  }

  return candidates;
}

export function containsRequiredWord(
  responseTokens: string[],
  keyword: string
): boolean {
  const candidates = inflectionCandidates(keyword);

  return responseTokens.some((token) =>
    candidates.has(token.toLocaleLowerCase("en-US"))
  );
}

export function looksLikeObviousSpam(tokens: string[]): boolean {
  const normalizedTokens = tokens.map((token) =>
    token.toLocaleLowerCase("en-US")
  );
  const frequencies = new Map<string, number>();

  for (const token of normalizedTokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  const highestFrequency = Math.max(0, ...frequencies.values());
  const repeatsDominantly =
    normalizedTokens.length >= 4 &&
    highestFrequency / normalizedTokens.length > 0.55;
  const containsKeyboardSmash = normalizedTokens.some(
    (token) =>
      /^(.)\1{3,}$/u.test(token) ||
      (/^[asdfghjklqwertyuiopzxcvbnm]{12,}$/u.test(token) &&
        !/[aeiou].*[aeiou].*[aeiou]/u.test(token))
  );

  return repeatsDominantly || containsKeyboardSmash;
}
