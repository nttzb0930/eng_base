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
  await api.register({ username: "learner", email: "l@example.com", password: "secret", fullName: "Learner" });
  await api.refresh();
  await api.logout();

  assert.deepEqual(requests, [
    { method: "POST", path: "/auth/login", body: { username: "learner", password: "secret" } },
    {
      method: "POST",
      path: "/auth/register",
      body: { username: "learner", email: "l@example.com", password: "secret", fullName: "Learner" },
    },
    { method: "POST", path: "/auth/refresh", body: undefined },
    { method: "POST", path: "/auth/logout", body: undefined },
  ]);
});
