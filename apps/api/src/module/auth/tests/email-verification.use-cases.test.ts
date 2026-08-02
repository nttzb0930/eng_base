import assert from "node:assert/strict";
import test from "node:test";

import { VerifyEmailUseCase } from "../use-cases/verify-email.usecase";
import { ResendVerificationUseCase } from "../use-cases/resend-verification.usecase";

test("verification accepts the active code and marks the account verified", async () => {
  const user = {
    id: "user-1",
    email: "learner@example.com",
    email_verified_at: null,
    verification_code_hash: "stored-hash",
    verification_code_expires_at: new Date(Date.now() + 60_000),
    verification_attempts: 0,
  };
  const prisma = {
    users: {
      findUnique: async () => user,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(user, data);
        return user;
      },
    },
  };
  const verification = {
    verify: async () => true,
  };

  const result = await new VerifyEmailUseCase(
    prisma as never,
    verification as never
  ).execute({ email: user.email, code: "123456" });

  assert.deepEqual(result, { success: true });
  assert.ok(user.email_verified_at);
  assert.equal(user.verification_code_hash, null);
});

test("resend replaces the code and sends it to an unverified account", async () => {
  const user = {
    id: "user-1",
    email: "learner@example.com",
    full_name: "Learner",
    email_verified_at: null,
    verification_sent_at: null,
  };
  const updates: Record<string, unknown>[] = [];
  const prisma = {
    users: {
      findUnique: async () => user,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        Object.assign(user, data);
        return user;
      },
    },
  };
  const verification = {
    generate: async () => ({
      code: "654321",
      hash: "new-hash",
      expiresAt: new Date(Date.now() + 600_000),
    }),
  };
  const mailer = {
    sendVerificationEmail: async (input: Record<string, unknown>) => input,
  };

  const result = await new ResendVerificationUseCase(
    prisma as never,
    verification as never,
    mailer as never
  ).execute({ email: user.email });

  assert.deepEqual(result, { success: true });
  assert.equal(updates[0].verification_code_hash, "new-hash");
});
