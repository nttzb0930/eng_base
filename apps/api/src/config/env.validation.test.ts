import assert from "node:assert/strict";
import test from "node:test";

import { validateEnvironment } from "./env.validation";

test("API environment Interface validates database configuration and defaults", () => {
  const configuration = validateEnvironment({
    DATABASE_URL: "postgresql://localhost/lingo",
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  });

  assert.equal(configuration.API_PORT, 4000);
  assert.equal(configuration.TRUST_PROXY_HOPS, 0);
  assert.equal(
    configuration.CORS_ORIGINS,
    "http://localhost:3000,http://localhost:3001"
  );
});

test("API environment Interface validates trusted proxy hop count", () => {
  const base = {
    DATABASE_URL: "postgresql://localhost/lingo",
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  };
  assert.equal(validateEnvironment({ ...base, TRUST_PROXY_HOPS: 1 }).TRUST_PROXY_HOPS, 1);
  assert.throws(() => validateEnvironment({ ...base, TRUST_PROXY_HOPS: -1 }), /TRUST_PROXY_HOPS/);
});

test("API environment Interface rejects a missing database URL", () => {
  assert.throws(() => validateEnvironment({}), /DATABASE_URL/);
});

test("API environment Interface rejects missing, weak, or reused JWT secrets", () => {
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: "postgresql://localhost/lingo" }),
    /JWT_ACCESS_SECRET/
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgresql://localhost/lingo",
        JWT_ACCESS_SECRET: "short",
        JWT_REFRESH_SECRET: "also-short",
      }),
    /at least 32 characters/
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgresql://localhost/lingo",
        JWT_ACCESS_SECRET: "same-secret-that-is-long-enough-123",
        JWT_REFRESH_SECRET: "same-secret-that-is-long-enough-123",
      }),
    /must be different/
  );
});
