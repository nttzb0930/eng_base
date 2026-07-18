import assert from "node:assert/strict";
import test from "node:test";

import { createAuthSessionBootstrap } from "../session/auth-session-bootstrap";
import type { AuthUser } from "../types/auth.types";

const learner: AuthUser = {
  id: "learner-1",
  username: "learner",
  email: "learner@example.com",
  role: "USER",
  fullName: "Learner",
};

test("learner Auth bootstrap refreshes at most once", async () => {
  let refreshCalls = 0;
  let authenticatedCalls = 0;
  const bootstrap = createAuthSessionBootstrap({
    hasRefreshSession: () => true,
    refresh: async () => {
      refreshCalls += 1;
      return { access_token: "access", user: learner };
    },
    setAuthenticated: () => {
      authenticatedCalls += 1;
    },
    clearSession: () => undefined,
    setUnauthenticated: () => undefined,
  });

  await Promise.all([bootstrap.run(), bootstrap.run()]);
  await bootstrap.run();

  assert.equal(refreshCalls, 1);
  assert.equal(authenticatedCalls, 1);
});

test("learner Auth bootstrap clears a session when no refresh cookie exists", async () => {
  let refreshCalls = 0;
  let clearCalls = 0;
  let unauthenticatedCalls = 0;
  const bootstrap = createAuthSessionBootstrap({
    hasRefreshSession: () => false,
    refresh: async () => {
      refreshCalls += 1;
      return { access_token: "access", user: learner };
    },
    setAuthenticated: () => undefined,
    clearSession: () => {
      clearCalls += 1;
    },
    setUnauthenticated: () => {
      unauthenticatedCalls += 1;
    },
  });

  await bootstrap.run();

  assert.equal(refreshCalls, 0);
  assert.equal(clearCalls, 1);
  assert.equal(unauthenticatedCalls, 1);
});

test("learner Auth bootstrap clears a session when refresh fails", async () => {
  let clearCalls = 0;
  let unauthenticatedCalls = 0;
  const bootstrap = createAuthSessionBootstrap({
    hasRefreshSession: () => true,
    refresh: async () => {
      throw new Error("expired refresh session");
    },
    setAuthenticated: () => undefined,
    clearSession: () => {
      clearCalls += 1;
    },
    setUnauthenticated: () => {
      unauthenticatedCalls += 1;
    },
  });

  await bootstrap.run();

  assert.equal(clearCalls, 1);
  assert.equal(unauthenticatedCalls, 1);
});
