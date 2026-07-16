import assert from "node:assert/strict";
import test from "node:test";

import { AuthTokenService } from "../service/auth-token.service";

const tokens = new AuthTokenService({
  accessSecret: "access-secret",
  accessExpiresIn: "15m",
  refreshSecret: "refresh-secret",
  refreshExpiresIn: "7d",
});

test("Auth token Interface signs and verifies access claims", () => {
  const token = tokens.createAccessToken("user-7", "USER");
  const payload = tokens.verifyAccessToken(token);

  assert.equal(payload?.userId, "user-7");
  assert.equal(payload?.role, "USER");
});

test("Auth token Interface separates access and refresh secrets", () => {
  const accessToken = tokens.createAccessToken("user-7", "USER");
  const refreshToken = tokens.createRefreshToken("user-7", "USER");

  assert.equal(tokens.verifyRefreshToken(accessToken), null);
  assert.equal(tokens.verifyAccessToken(refreshToken), null);
});

test("Auth token Interface rejects malformed tokens", () => {
  assert.equal(tokens.verifyAccessToken("not-a-token"), null);
});
