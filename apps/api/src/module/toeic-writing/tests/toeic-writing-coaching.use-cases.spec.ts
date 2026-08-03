import assert from "node:assert/strict";
import test from "node:test";

import { GetToeicWritingCoachingUseCase } from "../use-cases/get-toeic-writing-coaching.use-case";

const version = "a".repeat(64);
const payload = {
  titleVi: "Khiếu nại máy in",
  promptEn: "From: Michael Brown",
  promptVi: "Người gửi: Michael Brown",
  requirements: [
    { order: 1, textEn: "Give two details", textVi: "Cung cấp hai chi tiết" },
  ],
  outlineLevel1: ["OPENING", "Thank the customer", "BODY", "Give advice", "ENDING", "Close politely"],
  outlineLevel2: ["OPENING", "Apologize", "BODY", "Ask one question", "ENDING", "Sign off"],
  chunksLevel1: ["Thank you for contacting us.", "Could you let us know...?"],
  chunksLevel2: ["We are sorry to hear that..."],
  sampleEn: "Dear Mr. Brown,\n\nThank you for contacting us.\n\nBest regards,",
  sampleVi: "Chào anh Brown,\n\nCảm ơn anh đã liên hệ.\n\nTrân trọng,",
};

function setup(overrides: { part?: number; contentVersion?: string; payload?: unknown } = {}) {
  const recorded: Array<{ kind: string; userId: string }> = [];
  const repository = {
    recordAssistance: (input: { kind: string; userId: string }) => {
      recorded.push(input);
      return Promise.resolve();
    },
    getAssistanceSnapshot: () =>
      Promise.resolve({
        outlineViewed: recorded.some(({ kind }) => kind === "OUTLINE"),
        vocabularyViewed: recorded.some(({ kind }) => kind === "VOCABULARY"),
        sampleViewed: recorded.some(({ kind }) => kind === "SAMPLE"),
        communityAnswerRestored: false,
      }),
  };
  const source = {
    getPublishedCoachingTask: () =>
      Promise.resolve({
        id: 22,
        part: overrides.part ?? 2,
        contentVersion: overrides.contentVersion ?? version,
        payload: overrides.payload ?? payload,
      }),
  };
  return {
    recorded,
    useCase: new GetToeicWritingCoachingUseCase(source, repository),
  };
}

test("maps both authored outline variants into stable sections", async () => {
  const { useCase, recorded } = setup();
  const result = await useCase.execute("learner-1", 22, "OUTLINE", version);

  assert.equal(result.kind, "OUTLINE");
  if (result.kind !== "OUTLINE") return;
  assert.deepEqual(result.variants[0]?.sections, [
    { kind: "OPENING", items: ["Thank the customer"] },
    { kind: "BODY", items: ["Give advice"] },
    { kind: "ENDING", items: ["Close politely"] },
  ]);
  assert.equal(result.variants.length, 2);
  assert.equal(result.assistance.outlineViewed, true);
  assert.equal(recorded[0]?.kind, "OUTLINE");
});

test("maps vocabulary chunks without inventing missing translations", async () => {
  const { useCase } = setup();
  const result = await useCase.execute("learner-1", 22, "VOCABULARY", version);

  assert.equal(result.kind, "VOCABULARY");
  if (result.kind !== "VOCABULARY") return;
  assert.deepEqual(result.variants[0]?.items[0], {
    patternEn: "Thank you for contacting us.",
    meaningVi: null,
    exampleEn: null,
    exampleVi: null,
  });
  assert.equal(result.assistance.vocabularyViewed, true);
});

test("records SAMPLE assistance before returning authored content", async () => {
  const { useCase, recorded } = setup();
  const result = await useCase.execute("learner-1", 22, "SAMPLE", version);

  assert.equal(recorded[0]?.kind, "SAMPLE");
  assert.equal(result.kind, "SAMPLE");
  if (result.kind !== "SAMPLE") return;
  assert.match(result.sampleEn, /Dear Mr\. Brown/u);
  assert.deepEqual(result.structure.map(({ kind }) => kind), [
    "OPENING",
    "BODY",
    "ENDING",
  ]);
  assert.equal(result.assistance.sampleViewed, true);
});

test("returns an empty typed panel when authored content is missing", async () => {
  const { useCase } = setup({
    payload: { ...payload, chunksLevel1: [], chunksLevel2: [] },
  });
  const result = await useCase.execute("learner-1", 22, "VOCABULARY", version);

  assert.equal(result.kind, "VOCABULARY");
  if (result.kind !== "VOCABULARY") return;
  assert.deepEqual(result.variants, [
    { level: 1, items: [] },
    { level: 2, items: [] },
  ]);
});

test("rejects Part 1 tasks and stale content versions before recording", async () => {
  const partOne = setup({ part: 1 });
  await assert.rejects(
    () => partOne.useCase.execute("learner-1", 22, "OUTLINE", version),
    (error: unknown) =>
      JSON.stringify(error).includes("WRITING_COACHING_UNAVAILABLE")
  );
  assert.equal(partOne.recorded.length, 0);

  const stale = setup();
  await assert.rejects(
    () => stale.useCase.execute("learner-1", 22, "SAMPLE", "b".repeat(64)),
    (error: unknown) =>
      JSON.stringify(error).includes("WRITING_CONTENT_VERSION_CONFLICT")
  );
  assert.equal(stale.recorded.length, 0);
});
