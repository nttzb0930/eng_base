import assert from "node:assert/strict";
import test from "node:test";

import {
  buildToeicListeningPracticeTest,
  validateToeicListeningPracticeTest,
  withListeningSourceVersion,
} from "./toeic-listening-practice.canonical";
import type {
  ToeicListeningPart,
  ToeicListeningPracticeTest,
} from "./toeic-listening-practice.types";

function fixture(): ToeicListeningPracticeTest {
  const media = [
    {
      id: "audio",
      role: "AUDIO" as const,
      sourceUrl: "https://media.example/audio.mp3",
      storagePath: "media/audio.mp3",
      sha256: "a".repeat(64),
      bytes: 10,
      contentType: "audio/mpeg",
    },
    {
      id: "image",
      role: "IMAGE" as const,
      sourceUrl: "https://media.example/image.png",
      storagePath: "media/image.png",
      sha256: "b".repeat(64),
      bytes: 10,
      contentType: "image/png",
    },
  ];
  const counts: Record<ToeicListeningPart, number> = {
    1: 6,
    2: 25,
    3: 39,
    4: 30,
  };
  let number = 1;
  const parts = ([1, 2, 3, 4] as const).map((part) => {
    const stimuli =
      part < 3
        ? []
        : Array.from({ length: part === 3 ? 13 : 10 }, (_, index) => ({
            sourceStimulusId: `s-${part}-${index}`,
            transcript: `Transcript ${part}-${index}`,
            translation: "Bản dịch",
            audioMediaId: "audio",
            imageMediaIds: [],
          }));
    const questions = Array.from({ length: counts[part] }, (_, index) => {
      const sourceNumber = number++;
      return {
        sourceQuestionId: `q-${sourceNumber}`,
        sourceNumber,
        stimulusId:
          part < 3 ? null : stimuli[Math.floor(index / 3)]!.sourceStimulusId,
        prompt: part < 3 ? null : `Question ${sourceNumber}`,
        transcript: part < 3 ? `Transcript ${sourceNumber}` : null,
        translation: "Bản dịch",
        explanation: null,
        audioMediaId: part < 3 ? "audio" : null,
        imageMediaIds: part === 1 ? ["image"] : [],
        choices: Array.from(
          { length: part === 2 ? 3 : 4 },
          (_, choiceIndex) => ({
            label: String.fromCharCode(65 + choiceIndex),
            text: part < 3 ? null : `Choice ${choiceIndex + 1}`,
            correct: choiceIndex === 0,
          })
        ),
      };
    });
    return { part, stimuli, questions };
  });
  return withListeningSourceVersion({
    schemaVersion: 1,
    source: "dautoeic",
    sourceSetId: "set-1",
    sourceSetName: "2026",
    sourceTestId: "test-1",
    title: "Test 1",
    parts,
    media,
  });
}

test("accepts a complete 100-question Listening package", () => {
  assert.deepEqual(validateToeicListeningPracticeTest(fixture()), {
    valid: true,
    errors: [],
  });
});

test("rejects invalid counts, grouping, transcript, answer key, and media checksum", () => {
  const mutations: Array<(value: ToeicListeningPracticeTest) => void> = [
    (value) => void value.parts[0]!.questions.pop(),
    (value) => void value.parts[2]!.stimuli.pop(),
    (value) => void (value.parts[1]!.questions[0]!.transcript = null),
    (value) => void (value.parts[0]!.questions[0]!.choices[1]!.correct = true),
    (value) => void (value.media[0]!.sha256 = "bad"),
  ];
  for (const mutate of mutations) {
    const value = fixture();
    mutate(value);
    assert.equal(validateToeicListeningPracticeTest(value).valid, false);
  }
});

test("source version ignores provider URLs but changes with media checksum", () => {
  const first = fixture();
  const second = fixture();
  second.media[0]!.sourceUrl = "https://media.example/signed-new.mp3";
  const urlChanged = withListeningSourceVersion({
    ...second,
    listeningSourceVersion: undefined as never,
  });
  assert.equal(urlChanged.listeningSourceVersion, first.listeningSourceVersion);

  second.media[0]!.sha256 = "c".repeat(64);
  const checksumChanged = withListeningSourceVersion({
    ...second,
    listeningSourceVersion: undefined as never,
  });
  assert.notEqual(
    checksumChanged.listeningSourceVersion,
    first.listeningSourceVersion
  );
});

test("Parts 1 and 2 use source passage_text as their transcript", () => {
  const media = fixture().media;
  const value = buildToeicListeningPracticeTest({
    sourceSetId: "set-1",
    sourceSetName: "2026",
    sourceTestId: "test-1",
    title: "Test 1",
    questions: [
      {
        id: "q-1",
        part: 1,
        question_number: 1,
        passage_text: "Part one spoken script",
        correct_answer: "A",
        audio_url: "https://media.example/audio.mp3",
        image_url: "https://media.example/image.png",
      },
      {
        id: "q-7",
        part: 2,
        question_number: 7,
        passage_text: "Part two spoken script",
        correct_answer: "B",
        audio_url: "https://media.example/audio.mp3",
      },
    ],
    stimuli: [],
    media,
  });

  assert.equal(
    value.parts[0]?.questions[0]?.transcript,
    "Part one spoken script"
  );
  assert.equal(
    value.parts[1]?.questions[0]?.transcript,
    "Part two spoken script"
  );
});
