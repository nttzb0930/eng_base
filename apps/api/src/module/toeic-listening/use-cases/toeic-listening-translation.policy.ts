import type { ToeicListeningPart } from "@repo/shared";

type AnswerTranslation = { label: string; text: string };

export function parseToeicListeningChoiceTranslation(
  part: ToeicListeningPart,
  translation: string | null
): {
  questionTranslation: string | null;
  answerTranslations: AnswerTranslation[];
} {
  if ((part !== 1 && part !== 2) || !translation?.trim()) {
    return { questionTranslation: null, answerTranslations: [] };
  }

  const normalized = translation.replace(/\r\n?/gu, "\n").trim();
  const markers = [...normalized.matchAll(/(?:^|\n)\s*\(([A-D])\)\s*/gu)];
  if (markers.length === 0) {
    return {
      questionTranslation: part === 2 ? normalized : null,
      answerTranslations: [],
    };
  }

  const firstMarkerIndex = markers[0]?.index ?? 0;
  const prefix = normalized.slice(0, firstMarkerIndex).trim();
  const answerTranslations = markers.flatMap((marker, index) => {
    const label = marker[1];
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? normalized.length;
    const text = normalized.slice(start, end).trim();
    return label && text ? [{ label, text }] : [];
  });

  return {
    questionTranslation: part === 2 && prefix ? prefix : null,
    answerTranslations,
  };
}
