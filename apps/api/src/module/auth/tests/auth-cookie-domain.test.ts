import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";

import { AUTH_COOKIE_NAMES } from "../../../common/http/auth-cookie.constants";
import { AuthController } from "../auth.controller";

type CookieCall = {
  name: string;
  options: { domain?: string };
};

function createController() {
  return new AuthController(
    {
      execute: async () => ({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: { id: "user-1", username: "learner", role: "USER" },
      }),
    } as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    { execute: async () => ({ message: "Logged out successfully" }) } as never,
    { refreshMaxAgeMs: 1_000, accessMaxAgeMs: 500 } as never,
    {
      isProduction: true,
      authCookieDomain: "nttzb0930.io.vn",
    } as never
  );
}

test("learner Auth shares only the refresh marker across production subdomains", async () => {
  const cookieCalls: CookieCall[] = [];
  const clearCalls: CookieCall[] = [];
  const response = {
    cookie: (name: string, _value: string, options: CookieCall["options"]) => {
      cookieCalls.push({ name, options });
    },
    clearCookie: (name: string, options: CookieCall["options"]) => {
      clearCalls.push({ name, options });
    },
  } as unknown as Response;
  const controller = createController();

  await controller.login({ username: "learner", password: "secret" }, response);
  await controller.logout({ headers: {} } as Request, response);

  const markerCookie = cookieCalls.find(
    ({ name }) => name === AUTH_COOKIE_NAMES.refreshMarker
  );
  const markerClear = clearCalls.find(
    ({ name }) => name === AUTH_COOKIE_NAMES.refreshMarker
  );
  assert.equal(markerCookie?.options.domain, "nttzb0930.io.vn");
  assert.equal(markerClear?.options.domain, "nttzb0930.io.vn");

  for (const name of [AUTH_COOKIE_NAMES.refresh, AUTH_COOKIE_NAMES.access]) {
    assert.equal(
      cookieCalls.find((call) => call.name === name)?.options.domain,
      undefined
    );
    assert.equal(
      clearCalls.find((call) => call.name === name)?.options.domain,
      undefined
    );
  }
});
