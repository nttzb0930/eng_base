import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import type { ReadingSourceCandidateRepository } from "../repository/reading-source-candidate.repository";
import { ConvertReadingSourceCandidateUseCase } from "../use-cases/convert-reading-source-candidate.use-case";
import { GetReadingSourceCandidateUseCase } from "../use-cases/get-reading-source-candidate.use-case";
import { ListReadingSourceCandidatesUseCase } from "../use-cases/list-reading-source-candidates.use-case";
import { RejectReadingSourceCandidateUseCase } from "../use-cases/reject-reading-source-candidate.use-case";

const candidate = {
  id: 7,
  source: "dautoeic",
  sourceId: "source-7",
  sourceVersion: "a".repeat(64),
  sourceLevel: "1" as const,
  sourceTitle: "Office notice",
  sourceTopic: "Office",
  status: "PENDING" as const,
  contentSha256: "b".repeat(64),
  licenseReference: "https://dautoeic.com/reading",
  questionCount: 1,
  importedAt: "2026-07-31T00:00:00.000Z",
  convertedPassageId: null,
  sourceHtml: "<p>Source</p>",
  plainTextDraft: "Source",
  questions: [{
    question: "Where?",
    translation: "Ở đâu?",
    explanation: "The notice says so.",
    choices: [
      { label: "A", text: "Office" },
      { label: "B", text: "Home" },
    ],
    correct: "A",
  }],
  vocabulary: [],
  rejectionReason: null,
};

const payload = {
  slug: "office-notice",
  title: "Office notice",
  body: "Source",
  cefrLevel: "A1" as const,
  topicId: 2,
  estimatedMinutes: 2,
  questions: [{
    prompt: "Where?",
    order: 1,
    options: [
      { text: "Office", order: 1, correct: true },
      { text: "Home", order: 2, correct: false },
    ],
  }],
};

function repository(overrides: Partial<ReadingSourceCandidateRepository> = {}) {
  return {
    list: async () => ({ items: [candidate], total: 1 }),
    findDetail: async () => candidate,
    topicExists: async () => true,
    convertToDraft: async () => ({
      candidate: { ...candidate, status: "CONVERTED" as const },
      passage: { id: 10 },
    }),
    reject: async () => ({
      ...candidate,
      status: "REJECTED" as const,
    }),
    ...overrides,
  } as ReadingSourceCandidateRepository;
}

test("lists with normalized filters and returns repository pagination", async () => {
  let received: unknown;
  const result = await new ListReadingSourceCandidatesUseCase(
    repository({
      list: async (query) => {
        received = query;
        return { items: [candidate], total: 1 };
      },
    }),
  ).execute({ page: 2, limit: 10, status: "PENDING", search: " office " });
  assert.deepEqual(received, {
    page: 2,
    limit: 10,
    status: "PENDING",
    sourceLevel: undefined,
    search: "office",
  });
  assert.equal(result.total, 1);
});

test("detail throws when the candidate does not exist", async () => {
  await assert.rejects(
    () =>
      new GetReadingSourceCandidateUseCase(
        repository({ findDetail: async () => null }),
      ).execute(99),
    NotFoundException,
  );
});

test("conversion validates status, topic, content, and slug conflicts", async () => {
  await assert.rejects(
    () =>
      new ConvertReadingSourceCandidateUseCase(
        repository({
          findDetail: async () => ({ ...candidate, status: "REJECTED" }),
        }),
      ).execute(7, payload),
    ConflictException,
  );
  await assert.rejects(
    () =>
      new ConvertReadingSourceCandidateUseCase(
        repository({ topicExists: async () => false }),
      ).execute(7, payload),
    NotFoundException,
  );
  await assert.rejects(
    () =>
      new ConvertReadingSourceCandidateUseCase(repository()).execute(7, {
        ...payload,
        questions: [],
      }),
    BadRequestException,
  );
  await assert.rejects(
    () =>
      new ConvertReadingSourceCandidateUseCase(
        repository({
          convertToDraft: async () => {
            throw { code: "P2002", meta: { target: ["slug"] } };
          },
        }),
      ).execute(7, payload),
    ConflictException,
  );
});

test("rejection requires a pending candidate and a meaningful reason", async () => {
  await assert.rejects(
    () =>
      new RejectReadingSourceCandidateUseCase(repository()).execute(7, {
        reason: " ",
      }),
    BadRequestException,
  );
  await assert.rejects(
    () =>
      new RejectReadingSourceCandidateUseCase(
        repository({
          findDetail: async () => ({ ...candidate, status: "CONVERTED" }),
        }),
      ).execute(7, { reason: "Duplicate" }),
    ConflictException,
  );
});
