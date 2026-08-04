import assert from "node:assert/strict";
import test from "node:test";

import { createAuthApi } from "../api/auth.api";

test("Learner Auth preserves browser endpoints and payloads", async () => {
  const requests: unknown[] = [];
  const http = {
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: { access_token: "token", user: { id: "1" } } as T };
    },
  };
  const api = createAuthApi(http);

  await api.login({ username: "learner", password: "secret" });
  await api.register({
    username: "learner",
    email: "l@example.com",
    password: "secret",
    fullName: "Learner",
  });
  await api.verifyEmail({ email: "l@example.com", code: "123456" });
  await api.resendVerification("l@example.com");
  await api.requestPasswordReset({ email: "l@example.com" });
  await api.resetPassword({
    email: "l@example.com",
    code: "123456",
    newPassword: "new-password",
  });
  await api.refresh();
  await api.logout();

  assert.deepEqual(requests, [
    {
      method: "POST",
      path: "/auth/login",
      body: { username: "learner", password: "secret" },
    },
    {
      method: "POST",
      path: "/auth/register",
      body: {
        username: "learner",
        email: "l@example.com",
        password: "secret",
        fullName: "Learner",
      },
    },
    {
      method: "POST",
      path: "/auth/verify-email",
      body: { email: "l@example.com", code: "123456" },
    },
    {
      method: "POST",
      path: "/auth/resend-verification",
      body: { email: "l@example.com" },
    },
    {
      method: "POST",
      path: "/auth/forgot-password",
      body: { email: "l@example.com" },
    },
    {
      method: "POST",
      path: "/auth/reset-password",
      body: {
        email: "l@example.com",
        code: "123456",
        newPassword: "new-password",
      },
    },
    { method: "POST", path: "/auth/refresh", body: undefined },
    { method: "POST", path: "/auth/logout", body: undefined },
  ]);
});
