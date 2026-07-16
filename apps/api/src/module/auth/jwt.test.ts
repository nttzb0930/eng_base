import assert from "node:assert/strict";
import test from "node:test";

import { signJwt, verifyJwt } from "./jwt";

test("JWT public interface signs and verifies claims", () => {
  const token = signJwt({ userId: "user-7", role: "admin" }, "secret", 60);

  const claims = verifyJwt(token, "secret");

  assert.equal(claims?.userId, "user-7");
  assert.equal(claims?.role, "admin");
});

test("JWT verification rejects a different secret and expired tokens", () => {
  const token = signJwt({ userId: "user-7" }, "secret", 60);
  const expiredToken = signJwt({ userId: "user-7" }, "secret", -1);

  assert.equal(verifyJwt(token, "wrong-secret"), null);
  assert.equal(verifyJwt(expiredToken, "secret"), null);
});
