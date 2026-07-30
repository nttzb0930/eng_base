import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateAdminReadingPassageUseCase } from "../use-cases/create-admin-reading-passage.use-case";
import { PublishAdminReadingPassageUseCase } from "../use-cases/publish-admin-reading-passage.use-case";
import { UnpublishAdminReadingPassageUseCase } from "../use-cases/unpublish-admin-reading-passage.use-case";

const body = {
  slug: "a-day-in-hanoi",
  title: "A Day in Hanoi",
  body: "Mia lives in Hanoi.",
  cefrLevel: "A1" as const,
  topicId: null,
  estimatedMinutes: 3,
  questions: [
    {
      prompt: "Where does Mia live?",
      order: 1,
      options: [
        { text: "In Hanoi", order: 1, correct: true },
        { text: "In London", order: 2, correct: false },
      ],
    },
  ],
};

const aggregate = {
  id: 1,
  slug: body.slug,
  title: body.title,
  body: body.body,
  cefr_level: "A1",
  topic_id: null,
  estimated_minutes: 3,
  status: "DRAFT",
  published_at: null,
  created_at: new Date("2026-07-30T00:00:00.000Z"),
  updated_at: new Date("2026-07-30T00:00:00.000Z"),
  vocabulary_topics: null,
  reading_questions: [
    {
      id: 10,
      passage_id: 1,
      prompt: body.questions[0]!.prompt,
      order: 1,
      reading_options: [
        { id: 100, question_id: 10, ...body.questions[0]!.options[0] },
        { id: 101, question_id: 10, ...body.questions[0]!.options[1] },
      ],
    },
  ],
};

test("create persists a validated draft aggregate", async () => {
  const calls: unknown[] = [];
  const prisma = {
    reading_passages: {
      create: (args: unknown) => {
        calls.push(args);
        return Promise.resolve(aggregate);
      },
    },
  } as unknown as PrismaService;

  const result = await new CreateAdminReadingPassageUseCase(prisma).execute(
    body,
  );

  assert.equal(result.status, "DRAFT");
  assert.equal(calls.length, 1);
  const createCall = calls[0] as {
    data: unknown;
    include: unknown;
  };
  assert.ok(createCall.include);
  assert.deepEqual(
    createCall.data,
    {
      slug: body.slug,
      title: body.title,
      body: body.body,
      cefr_level: "A1",
      topic_id: null,
      estimated_minutes: 3,
      reading_questions: {
        create: [
          {
            prompt: body.questions[0]!.prompt,
            order: 1,
            reading_options: {
              create: body.questions[0]!.options,
            },
          },
        ],
      },
    },
  );
});

test("create rejects an invalid aggregate before persistence", async () => {
  const prisma = {
    reading_passages: {
      create: () => assert.fail("persistence must not run"),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new CreateAdminReadingPassageUseCase(prisma).execute({
        ...body,
        questions: [],
      }),
    BadRequestException,
  );
});

test("publish validates content and unpublish clears publication state", async () => {
  const updates: unknown[] = [];
  const prisma = {
    reading_passages: {
      findUnique: () => Promise.resolve(aggregate),
      update: (args: unknown) => {
        updates.push(args);
        return Promise.resolve({
          ...aggregate,
          status:
            (args as { data: { status: string } }).data.status,
          published_at:
            (args as { data: { published_at: Date | null } }).data
              .published_at,
        });
      },
    },
  } as unknown as PrismaService;

  await new PublishAdminReadingPassageUseCase(prisma).execute(1);
  await new UnpublishAdminReadingPassageUseCase(prisma).execute(1);

  assert.equal(
    (updates[0] as { data: { status: string } }).data.status,
    "PUBLISHED",
  );
  assert.deepEqual(
    (updates[1] as { data: unknown }).data,
    { status: "DRAFT", published_at: null },
  );
});
