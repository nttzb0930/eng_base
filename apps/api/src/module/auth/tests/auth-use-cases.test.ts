import assert from "node:assert/strict";
import test from "node:test";
import type { users } from "@prisma/client";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { AuthTokenService } from "../service/auth-token.service";
import { PasswordService } from "../service/password.service";
import { VerificationCodeService } from "../service/verification-code.service";
import { LoginUserUseCase } from "../use-cases/login-user.usecase";
import { LogoutUserUseCase } from "../use-cases/logout-user.usecase";
import { RefreshTokenUseCase } from "../use-cases/refresh-token.usecase";
import { RegisterUserUseCase } from "../use-cases/register-user.usecase";

const tokens = new AuthTokenService({
  accessSecret: "access-secret",
  accessExpiresIn: "15m",
  refreshSecret: "refresh-secret",
  refreshExpiresIn: "7d",
});
const passwords = new PasswordService();
const enabledSettings = { get: async () => true };

function createPrismaFake(initialUser?: users) {
  let user = initialUser;
  const prisma = {
    users: {
      findFirst: async () => user ?? null,
      findUnique: async () => user ?? null,
      create: async ({
        data,
      }: {
        data: Omit<
          users,
          | "id"
          | "created_at"
          | "updated_at"
          | "refresh_token"
          | "email_verified_at"
          | "verification_code_hash"
          | "verification_code_expires_at"
          | "verification_attempts"
          | "verification_sent_at"
          | "password_reset_code_hash"
          | "password_reset_code_expires_at"
          | "password_reset_attempts"
          | "password_reset_sent_at"
        >;
      }) => {
        user = {
          ...data,
          id: "created-user",
          refresh_token: null,
          email_verified_at: null,
          verification_code_hash: null,
          verification_code_expires_at: null,
          verification_attempts: 0,
          verification_sent_at: null,
          password_reset_code_hash: null,
          password_reset_code_expires_at: null,
          password_reset_attempts: 0,
          password_reset_sent_at: null,
          created_at: new Date(0),
          updated_at: new Date(0),
        };
        return user;
      },
      update: async ({ data }: { data: Partial<users> }) => {
        user = user ? { ...user, ...data } : user;
        return user;
      },
      updateMany: async ({ data }: { data: Partial<users> }) => {
        user = user ? { ...user, ...data } : user;
        return { count: user ? 1 : 0 };
      },
    },
  };
  return {
    prisma: prisma as unknown as PrismaService,
    currentUser: () => user,
  };
}

async function existingUser(role: "USER" | "ADMIN" = "USER"): Promise<users> {
  return {
    id: `${role.toLowerCase()}-1`,
    username: role.toLowerCase(),
    email: `${role.toLowerCase()}@example.com`,
    full_name: `${role} One`,
    password: await passwords.hash("secret"),
    role,
    refresh_token: null,
    email_verified_at: new Date(0),
    verification_code_hash: null,
    verification_code_expires_at: null,
    verification_attempts: 0,
    verification_sent_at: null,
    password_reset_code_hash: null,
    password_reset_code_expires_at: null,
    password_reset_attempts: 0,
    password_reset_sent_at: null,
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}

test("login use case preserves learner and admin result Interfaces", async () => {
  const learnerFake = createPrismaFake(await existingUser());
  const learnerLogin = new LoginUserUseCase(
    learnerFake.prisma,
    tokens,
    passwords
  );
  const learner = await learnerLogin.execute({
    username: "user",
    password: "secret",
  });
  assert.ok(learner.accessToken);
  assert.ok(learner.refreshToken);
  assert.equal(learner.user.role, "USER");

  const adminFake = createPrismaFake(await existingUser("ADMIN"));
  const adminLogin = new LoginUserUseCase(adminFake.prisma, tokens, passwords);
  const admin = await adminLogin.execute(
    { username: "admin", password: "secret" },
    "ADMIN"
  );
  assert.ok(admin.token);
  assert.equal(admin.user.role, "ADMIN");
  assert.equal("fullName" in admin.user, false);
});

test("register, refresh and logout use cases preserve session persistence", async () => {
  const fake = createPrismaFake();
  const verificationEmails: Array<{
    to: string;
    code: string;
    expiresInMinutes: number;
  }> = [];
  const register = new RegisterUserUseCase(
    fake.prisma,
    passwords,
    {
      sendVerificationEmail: async (input: {
        to: string;
        code: string;
        expiresInMinutes: number;
      }) => {
        verificationEmails.push(input);
      },
    },
    new VerificationCodeService(passwords),
    enabledSettings as never,
  );
  assert.deepEqual(
    await register.execute({
      username: "new-user",
      email: "NEW@EXAMPLE.COM",
      password: "secret",
      fullName: "New User",
    }),
    {
      success: true,
      verificationRequired: true,
      email: "new@example.com",
    }
  );
  assert.equal(fake.currentUser()?.email, "new@example.com");
  assert.equal(verificationEmails.length, 1);
  assert.equal(verificationEmails[0].to, "new@example.com");
  assert.equal(verificationEmails[0].code.length, 6);

  const refreshToken = tokens.createRefreshToken("created-user", "USER");
  await fake.prisma.users.update({
    where: { id: "created-user" },
    data: { refresh_token: refreshToken },
  });
  const refreshed = await new RefreshTokenUseCase(fake.prisma, tokens).execute(
    refreshToken
  );
  assert.ok(refreshed.accessToken);

  await new LogoutUserUseCase(fake.prisma, tokens).execute(
    refreshed.accessToken,
    refreshToken
  );
  assert.equal(fake.currentUser()?.refresh_token, null);
});

test("registration succeeds when the welcome email provider fails", async () => {
  const fake = createPrismaFake();
  const register = new RegisterUserUseCase(
    fake.prisma,
    passwords,
    {
      sendVerificationEmail: async () => {
        throw new Error("smtp unavailable");
      },
    },
    new VerificationCodeService(passwords),
    enabledSettings as never,
  );

  assert.deepEqual(
    await register.execute({
      username: "email-fallback",
      email: "fallback@example.com",
      password: "secret",
      fullName: "Email Fallback",
    }),
    {
      success: true,
      verificationRequired: true,
      email: "fallback@example.com",
    }
  );
  assert.equal(fake.currentUser()?.email, "fallback@example.com");
});

test("registration is unavailable when the runtime policy is disabled", async () => {
  const fake = createPrismaFake();
  const register = new RegisterUserUseCase(
    fake.prisma,
    passwords,
    { sendVerificationEmail: async () => undefined },
    new VerificationCodeService(passwords),
    { get: async () => false } as never,
  );

  await assert.rejects(
    () => register.execute({
      username: "closed-user",
      email: "closed@example.com",
      password: "secret",
      fullName: "Closed User",
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "REGISTRATION_DISABLED",
  );
  assert.equal(fake.currentUser(), undefined);
});

test("Auth failures keep public codes while carrying safe internal reasons", async () => {
  const missingUser = new LoginUserUseCase(
    createPrismaFake().prisma,
    tokens,
    passwords
  );
  await assert.rejects(
    () => missingUser.execute({ username: "missing", password: "secret" }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS" &&
      error.cause instanceof Error &&
      error.cause.message === "user_not_found"
  );

  await assert.rejects(
    () =>
      new RefreshTokenUseCase(createPrismaFake().prisma, tokens).execute(
        undefined
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "REFRESH_TOKEN_INVALID" &&
      error.cause instanceof Error &&
      error.cause.message === "refresh_token_missing"
  );
});

test("learner login is blocked until email verification", async () => {
  const user = await existingUser();
  user.email_verified_at = null;
  await assert.rejects(
    () =>
      new LoginUserUseCase(
        createPrismaFake(user).prisma,
        tokens,
        passwords
      ).execute({
        username: user.username,
        password: "secret",
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "EMAIL_NOT_VERIFIED" &&
      error.cause instanceof Error &&
      error.cause.message === "email_not_verified"
  );
});
