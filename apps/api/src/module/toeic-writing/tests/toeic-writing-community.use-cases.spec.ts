import assert from "node:assert/strict";
import test from "node:test";

import { ListToeicWritingCommunityUseCase } from "../use-cases/list-toeic-writing-community.use-case";
import { RestoreToeicWritingCommunityResponseUseCase } from "../use-cases/restore-toeic-writing-community-response.use-case";
import { ShareToeicWritingSubmissionUseCase } from "../use-cases/share-toeic-writing-submission.use-case";
import { UnshareToeicWritingSubmissionUseCase } from "../use-cases/unshare-toeic-writing-submission.use-case";

const version = "a".repeat(64);

test("sharing and unsharing are owner-only and idempotent", async () => {
  const writes: unknown[] = [];
  const prisma = {
    toeic_writing_submissions: {
      updateMany: (input: unknown) => {
        writes.push(input);
        return Promise.resolve({ count: 1 });
      },
    },
  };
  const now = new Date("2026-08-03T08:00:00.000Z");

  assert.deepEqual(
    await new ShareToeicWritingSubmissionUseCase(prisma as never, () => now).execute(
      "learner-1",
      31
    ),
    { shared: true, sharedAt: now.toISOString() }
  );
  assert.deepEqual(
    await new UnshareToeicWritingSubmissionUseCase(prisma as never, () => now).execute(
      "learner-1",
      31
    ),
    { shared: false }
  );
  assert.deepEqual(writes, [
    {
      where: { id: 31, user_id: "learner-1", task_part: 2 },
      data: { shared_at: now, share_revoked_at: null },
    },
    {
      where: { id: 31, user_id: "learner-1", task_part: 2 },
      data: { share_revoked_at: now },
    },
  ]);

  const denied = {
    toeic_writing_submissions: {
      updateMany: () => Promise.resolve({ count: 0 }),
    },
  };
  await assert.rejects(
    () => new ShareToeicWritingSubmissionUseCase(denied as never).execute("other", 31),
    (error: unknown) => JSON.stringify(error).includes("WRITING_SUBMISSION_NOT_FOUND")
  );
});

test("community lists only active shares for a published Part 2 task", async () => {
  const calls: unknown[] = [];
  const prisma = {
    toeic_writing_tasks: {
      findFirst: (input: unknown) => {
        calls.push(input);
        return Promise.resolve({ id: 22 });
      },
    },
    toeic_writing_submissions: {
      findMany: (input: unknown) => {
        calls.push(input);
        return Promise.resolve([
          {
            id: 41,
            user_id: "private-user-id",
            response_text: "Dear customer, here is a response.",
            shared_at: new Date("2026-08-03T09:00:00.000Z"),
          },
        ]);
      },
    },
  };
  const result = await new ListToeicWritingCommunityUseCase(prisma as never).execute(
    22,
    undefined,
    20
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.responseText, "Dear customer, here is a response.");
  assert.match(result.items[0]?.authorLabel ?? "", /^Learner [A-F0-9]{6}$/u);
  assert.equal(JSON.stringify(result).includes("private-user-id"), false);
  assert.equal("email" in (result.items[0] ?? {}), false);
  assert.deepEqual(calls[1], {
    where: {
      task_id: 22,
      shared_at: { not: null },
      share_revoked_at: null,
    },
    orderBy: [{ shared_at: "desc" }, { id: "desc" }],
    take: 21,
    select: {
      id: true,
      user_id: true,
      response_text: true,
      shared_at: true,
    },
  });
});

test("community pagination is capped and returns a stable next cursor", async () => {
  const rows = Array.from({ length: 21 }, (_, index) => ({
    id: 100 - index,
    user_id: `user-${index}`,
    response_text: `Response ${index}`,
    shared_at: new Date("2026-08-03T09:00:00.000Z"),
  }));
  const prisma = {
    toeic_writing_tasks: { findFirst: () => Promise.resolve({ id: 22 }) },
    toeic_writing_submissions: { findMany: () => Promise.resolve(rows) },
  };
  const result = await new ListToeicWritingCommunityUseCase(prisma as never).execute(
    22,
    undefined,
    20
  );
  assert.equal(result.items.length, 20);
  assert.equal(result.nextCursor, 81);
});

test("restore returns only an active shared response after recording assistance", async () => {
  const events: unknown[] = [];
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve({ id: 22, source_version: version }),
    },
    toeic_writing_submissions: {
      findFirst: () =>
        Promise.resolve({ response_text: "A community response." }),
    },
  };
  const repository = {
    recordAssistance: (input: unknown) => {
      events.push(input);
      return Promise.resolve();
    },
  };
  const result = await new RestoreToeicWritingCommunityResponseUseCase(
    prisma as never,
    repository as never
  ).execute("learner-1", 22, 41, version);

  assert.deepEqual(events, [
    {
      userId: "learner-1",
      taskId: 22,
      contentVersion: version,
      kind: "COMMUNITY_RESTORE",
    },
  ]);
  assert.deepEqual(result, { responseText: "A community response." });
});
