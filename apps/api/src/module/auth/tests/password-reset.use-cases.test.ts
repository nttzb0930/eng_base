import assert from "node:assert/strict";
import test from "node:test";

import { RequestPasswordResetUseCase } from "../use-cases/request-password-reset.usecase";
import { ResetPasswordUseCase } from "../use-cases/reset-password.usecase";

test("password reset request generates a code and does not reveal account existence", async () => {
  const user = {
    id: "user-1",
    email: "learner@example.com",
    password_reset_sent_at: null,
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
  const codes = {
    generate: async () => ({
      code: "123456",
      hash: "reset-hash",
      expiresAt: new Date(Date.now() + 600_000),
      sentAt: new Date(),
    }),
  };
  const mailer = {
    sendPasswordResetEmail: async (input: Record<string, unknown>) => input,
  };

  const result = await new RequestPasswordResetUseCase(
    prisma as never,
    codes as never,
    mailer as never
  ).execute({ email: user.email });

  assert.deepEqual(result, { success: true });
  assert.equal(updates[0].password_reset_code_hash, "reset-hash");
});

test("password reset verifies the code, hashes the new password, and invalidates refresh sessions", async () => {
  const user = {
    id: "user-1",
    email: "learner@example.com",
    password_reset_code_hash: "reset-hash",
    password_reset_code_expires_at: new Date(Date.now() + 60_000),
    password_reset_attempts: 0,
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
  const codes = { verify: async () => true };
  const passwords = { hash: async () => "new-password-hash" };

  const result = await new ResetPasswordUseCase(
    prisma as never,
    codes as never,
    passwords as never
  ).execute({
    email: user.email,
    code: "123456",
    newPassword: "new-password",
  });

  assert.deepEqual(result, { success: true });
  assert.equal(updates[0].password, "new-password-hash");
  assert.equal(updates[0].password_reset_code_hash, null);
  assert.equal(updates[0].refresh_token, null);
});
