import { createHash } from "node:crypto";

import {
  TOEIC_LISTENING_PART_COUNTS,
  type ToeicListeningMedia,
  type ToeicListeningPracticeTest,
} from "./toeic-listening-practice.types.js";

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : null;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Listening source row must be an object");
  }
  return value as Record<string, unknown>;
}

function answer(value: unknown) {
  const normalized = text(value)?.toUpperCase();
  if (!normalized || !["A", "B", "C", "D"].includes(normalized)) {
    throw new Error("Listening question answer key is invalid");
  }
  return normalized;
}

export function buildToeicListeningPracticeTest(input: {
  sourceSetId: string;
  sourceSetName: string;
  sourceTestId: string;
  title: string;
  questions: unknown[];
  stimuli: unknown[];
  media: ToeicListeningMedia[];
}): Omit<ToeicListeningPracticeTest, "listeningSourceVersion"> {
  const mediaByUrl = new Map(input.media.map((item) => [item.sourceUrl, item]));
  const stimulusRows = input.stimuli.map(record);
  const parts = ([1, 2, 3, 4] as const).map((part) => {
    const questions = input.questions
      .map(record)
      .filter((row) => Number(row.part) === part)
      .sort(
        (left, right) =>
          Number(left.question_number) - Number(right.question_number)
      )
      .map((row) => {
        const sourceQuestionId = id(row.id);
        if (!sourceQuestionId)
          throw new Error("Listening question ID is required");
        const sourceNumber = Number(row.question_number);
        const correct = answer(row.correct_answer);
        const optionCount = part === 2 ? 3 : 4;
        const audioUrl = text(row.audio_url);
        const imageUrl = text(row.image_url);
        return {
          sourceQuestionId,
          sourceNumber,
          stimulusId: id(row.passage_id),
          prompt: part >= 3 ? text(row.question_text) : null,
          transcript:
            part < 3
              ? (text(row.transcript) ??
                text(row.passage_text) ??
                text(row.question_text))
              : null,
          translation: text(row.transcript_vi) ?? text(row.dich_nghia),
          explanation: text(row.explanation_vi),
          audioMediaId: audioUrl
            ? (mediaByUrl.get(audioUrl)?.id ?? null)
            : null,
          imageMediaIds: imageUrl
            ? [mediaByUrl.get(imageUrl)?.id].filter((value): value is string =>
                Boolean(value)
              )
            : [],
          choices: Array.from({ length: optionCount }, (_, index) => {
            const label = String.fromCharCode(65 + index);
            return {
              label,
              text:
                part < 3 ? null : text(row[`option_${label.toLowerCase()}`]),
              correct: correct === label,
            };
          }),
        };
      });
    const stimuli = stimulusRows
      .filter((row) => Number(row.part) === part)
      .map((row) => {
        const sourceStimulusId = id(row.id);
        const audioUrl = text(row.audio_url);
        if (!sourceStimulusId || !audioUrl) {
          throw new Error("Listening stimulus ID and audio are required");
        }
        const imageUrl = text(row.image_url);
        return {
          sourceStimulusId,
          transcript: text(row.transcript) ?? text(row.passage_text) ?? "",
          translation: text(row.transcript_vi) ?? text(row.dich_nghia),
          audioMediaId: mediaByUrl.get(audioUrl)?.id ?? "",
          imageMediaIds: imageUrl
            ? [mediaByUrl.get(imageUrl)?.id].filter((value): value is string =>
                Boolean(value)
              )
            : [],
        };
      });
    return { part, stimuli, questions };
  });
  return {
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: input.sourceSetId,
    sourceSetName: input.sourceSetName.trim(),
    sourceTestId: input.sourceTestId,
    title: input.title.trim(),
    parts,
    media: [...input.media].sort((left, right) =>
      left.id.localeCompare(right.id)
    ),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([key]) =>
            key !== "listeningSourceVersion" &&
            key !== "sourceUrl" &&
            key !== "storagePath"
        )
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

export function sha256ListeningCanonical(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

export function withListeningSourceVersion(
  value: Omit<ToeicListeningPracticeTest, "listeningSourceVersion"> &
    Partial<Pick<ToeicListeningPracticeTest, "listeningSourceVersion">>
): ToeicListeningPracticeTest {
  return {
    ...value,
    listeningSourceVersion: sha256ListeningCanonical(value),
  };
}

export function validateToeicListeningPracticeTest(value: unknown) {
  const errors: string[] = [];
  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["Package must be an object"] };
  }
  const test = value as ToeicListeningPracticeTest;
  const parts = Array.isArray(test.parts) ? test.parts : [];
  const media = Array.isArray(test.media) ? test.media : [];
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const questionIds = new Set<string>();
  const numbers = new Set<number>();

  for (const item of media) {
    if (
      !item.id ||
      !["AUDIO", "IMAGE"].includes(item.role) ||
      !item.storagePath ||
      !/^[a-f0-9]{64}$/u.test(item.sha256) ||
      !Number.isInteger(item.bytes) ||
      item.bytes <= 0 ||
      !(
        item.contentType.startsWith("audio/") ||
        item.contentType.startsWith("image/")
      )
    ) {
      errors.push(`Media ${item.id || "unknown"} is invalid`);
    }
  }

  for (const part of [1, 2, 3, 4] as const) {
    const found = parts.find((entry) => entry.part === part);
    if (!found) {
      errors.push(`Part ${part} is required`);
      continue;
    }
    if (found.questions.length !== TOEIC_LISTENING_PART_COUNTS[part]) {
      errors.push(
        `Part ${part} must contain ${TOEIC_LISTENING_PART_COUNTS[part]} questions`
      );
    }
    const requiredGroups = part === 3 ? 13 : part === 4 ? 10 : 0;
    if (found.stimuli.length !== requiredGroups) {
      errors.push(`Part ${part} must contain ${requiredGroups} stimuli`);
    }
    const questionsByStimulus = new Map<string, number>();
    for (const stimulus of found.stimuli) {
      if (!stimulus.transcript.trim()) {
        errors.push(`Stimulus ${stimulus.sourceStimulusId} needs transcript`);
      }
      const audio = mediaById.get(stimulus.audioMediaId);
      if (!audio || audio.role !== "AUDIO") {
        errors.push(`Stimulus ${stimulus.sourceStimulusId} needs audio`);
      }
    }
    for (const question of found.questions) {
      if (questionIds.has(question.sourceQuestionId)) {
        errors.push("Duplicate question ID");
      }
      if (numbers.has(question.sourceNumber)) {
        errors.push("Duplicate question number");
      }
      questionIds.add(question.sourceQuestionId);
      numbers.add(question.sourceNumber);
      if (question.choices.filter((choice) => choice.correct).length !== 1) {
        errors.push(
          `Question ${question.sourceNumber} must have one correct choice`
        );
      }
      const expectedLabels =
        part === 2 ? ["A", "B", "C"] : ["A", "B", "C", "D"];
      if (
        question.choices.length !== expectedLabels.length ||
        question.choices.some(
          (choice, index) => choice.label !== expectedLabels[index]
        )
      ) {
        errors.push(`Question ${question.sourceNumber} has invalid choices`);
      }
      if (part < 3) {
        if (!question.transcript?.trim()) {
          errors.push(`Question ${question.sourceNumber} needs transcript`);
        }
        const audio = question.audioMediaId
          ? mediaById.get(question.audioMediaId)
          : undefined;
        if (!audio || audio.role !== "AUDIO") {
          errors.push(`Question ${question.sourceNumber} needs audio`);
        }
        if (
          part === 1 &&
          !question.imageMediaIds.some(
            (id) => mediaById.get(id)?.role === "IMAGE"
          )
        ) {
          errors.push(`Question ${question.sourceNumber} needs image`);
        }
      } else {
        if (!question.stimulusId) {
          errors.push(`Question ${question.sourceNumber} needs stimulus`);
        } else {
          questionsByStimulus.set(
            question.stimulusId,
            (questionsByStimulus.get(question.stimulusId) ?? 0) + 1
          );
        }
        if (!question.prompt?.trim()) {
          errors.push(`Question ${question.sourceNumber} needs prompt`);
        }
      }
    }
    if (
      part >= 3 &&
      found.stimuli.some(
        (stimulus) => questionsByStimulus.get(stimulus.sourceStimulusId) !== 3
      )
    ) {
      errors.push(`Part ${part} stimuli must have exactly three questions`);
    }
  }

  if (
    numbers.size !== 100 ||
    Array.from({ length: 100 }, (_, index) => index + 1).some(
      (number) => !numbers.has(number)
    )
  ) {
    errors.push("Listening questions must be numbered 1..100");
  }
  if (
    !/^[a-f0-9]{64}$/u.test(test.listeningSourceVersion ?? "") ||
    test.listeningSourceVersion !== sha256ListeningCanonical(test)
  ) {
    errors.push("Listening source version does not match canonical content");
  }
  return { valid: errors.length === 0, errors };
}
