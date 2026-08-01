import { sha256Canonical } from "../toeic-reading-practice/toeic-reading-practice.canonical.js";
import {
  TOEIC_LISTENING_PART_COUNTS,
  type ApprovedToeicTestIdentity,
  type ToeicListeningInventory,
  type ToeicListeningInventorySource,
} from "./toeic-listening-practice.types.js";

export async function inventoryToeicListeningPractice(input: {
  source: ToeicListeningInventorySource;
  approvedTests: ApprovedToeicTestIdentity[];
  readingInventorySha256: string;
  sourceSetName?: string;
  observedAt: string;
}): Promise<ToeicListeningInventory> {
  if (!/^[a-f0-9]{64}$/u.test(input.readingInventorySha256)) {
    throw new Error("readingInventorySha256 must be a lowercase SHA-256");
  }
  if (input.approvedTests.length === 0) {
    throw new Error("Approved Reading inventory does not contain tests");
  }

  const sourceTests = await input.source.listTests();
  const selectedTests = await Promise.all(
    [...input.approvedTests]
      .sort(
        (left, right) =>
          left.order - right.order ||
          left.sourceTestId.localeCompare(right.sourceTestId)
      )
      .map(async (approved) => {
        const sourceTest = sourceTests.find(
          (candidate) => candidate.sourceTestId === approved.sourceTestId
        );
        if (
          !sourceTest ||
          sourceTest.sourceSetId !== approved.sourceSetId ||
          sourceTest.title !== approved.title ||
          sourceTest.order !== approved.order
        ) {
          throw new Error(
            `Test ${approved.sourceTestId} identity does not match approved Reading inventory`
          );
        }

        const [questions, stimuli] = await Promise.all([
          input.source.listQuestionIndex(approved.sourceTestId),
          input.source.listStimulusIndex(approved.sourceTestId),
        ]);
        if (
          questions.some(
            (question) => question.sourceTestId !== approved.sourceTestId
          ) ||
          stimuli.some(
            (stimulus) => stimulus.sourceTestId !== approved.sourceTestId
          )
        ) {
          throw new Error(
            `Test ${approved.sourceTestId} source rows cross test identity`
          );
        }
        const questionCounts = {
          "1": questions.filter((row) => row.part === 1).length,
          "2": questions.filter((row) => row.part === 2).length,
          "3": questions.filter((row) => row.part === 3).length,
          "4": questions.filter((row) => row.part === 4).length,
        };
        for (const part of [1, 2, 3, 4] as const) {
          const key = String(part) as keyof typeof questionCounts;
          if (questionCounts[key] !== TOEIC_LISTENING_PART_COUNTS[part]) {
            throw new Error(
              `Test ${approved.sourceTestId} must expose 6/25/39/30 Listening questions`
            );
          }
        }
        return {
          ...approved,
          questionCounts,
          audioUrls: [
            ...new Set([
              ...questions.flatMap((row) => row.audioUrl ?? []),
              ...stimuli.flatMap((row) => row.audioUrl ?? []),
            ]),
          ].sort(),
          imageUrls: [
            ...new Set([
              ...questions.flatMap((row) => row.imageUrl ?? []),
              ...stimuli.flatMap((row) => row.imageUrl ?? []),
            ]),
          ].sort(),
        };
      })
  );

  const audioUrls = [
    ...new Set(selectedTests.flatMap((test) => test.audioUrls)),
  ];
  const imageUrls = [
    ...new Set(selectedTests.flatMap((test) => test.imageUrls)),
  ];
  const inspections = await Promise.all(
    [...audioUrls, ...imageUrls].map((url) => input.source.inspectMedia(url))
  );
  const media = inspections.map((item) => ({
    ...item,
    role: (audioUrls.includes(item.url) ? "AUDIO" : "IMAGE") as
      "AUDIO" | "IMAGE",
  }));
  const questionCounts = selectedTests.reduce(
    (total, item) => ({
      "1": total["1"] + item.questionCounts["1"],
      "2": total["2"] + item.questionCounts["2"],
      "3": total["3"] + item.questionCounts["3"],
      "4": total["4"] + item.questionCounts["4"],
    }),
    { "1": 0, "2": 0, "3": 0, "4": 0 }
  );
  const identity = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    sourceSetName:
      input.sourceSetName ?? input.approvedTests[0]?.sourceSetId ?? "unknown",
    readingInventorySha256: input.readingInventorySha256,
    selectedTests,
    questionCounts,
    audioCount: audioUrls.length,
    imageCount: imageUrls.length,
    knownMediaBytes: inspections.reduce(
      (total, item) => total + (item.bytes ?? 0),
      0
    ),
    unknownMediaSizeCount: inspections.filter((item) => item.bytes === null)
      .length,
    media,
  };
  return {
    ...identity,
    observedAt: input.observedAt,
    inventorySha256: sha256Canonical(identity),
  };
}
