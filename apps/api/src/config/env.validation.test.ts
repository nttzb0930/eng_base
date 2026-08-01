import assert from "node:assert/strict";
import test from "node:test";

import { validateEnvironment } from "./env.validation";

test("API environment Interface validates database configuration and defaults", () => {
  const configuration = validateEnvironment({
    DATABASE_URL: "postgresql://localhost/eng_base",
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  });

  assert.equal(configuration.API_PORT, 4000);
  assert.equal(configuration.APP_NAME, "English Base API");
  assert.equal(configuration.APP_SERVICE_NAME, "eng-base-api");
  assert.equal(configuration.TRUST_PROXY_HOPS, 0);
  assert.equal(
    configuration.CORS_ORIGINS,
    "http://localhost:3000,http://localhost:3001"
  );
});

test("API environment Interface validates trusted proxy hop count", () => {
  const base = {
    DATABASE_URL: "postgresql://localhost/eng_base",
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  };
  assert.equal(
    validateEnvironment({ ...base, TRUST_PROXY_HOPS: 1 }).TRUST_PROXY_HOPS,
    1
  );
  assert.throws(
    () => validateEnvironment({ ...base, TRUST_PROXY_HOPS: -1 }),
    /TRUST_PROXY_HOPS/
  );
});

test("API environment Interface rejects a missing database URL", () => {
  assert.throws(
    () =>
      validateEnvironment({
        JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
        JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
      }),
    /DATABASE_URL/
  );
});

test("API environment Interface accepts complete database components", () => {
  const configuration = validateEnvironment({
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_USER: "postgres",
    DB_PASSWORD: "local-password",
    DB_NAME: "eng_base",
    DB_SCHEMA: "public",
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  });

  assert.equal(configuration.DB_NAME, "eng_base");
});

test("API environment Interface resolves templates and rejects invalid database contracts", () => {
  const authentication = {
    JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
    JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
  };
  assert.throws(
    () =>
      validateEnvironment({
        ...authentication,
        DATABASE_URL:
          "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_USER: "postgres",
        DB_NAME: "eng_base",
        DB_SCHEMA: "public",
      }),
    /DB_PASSWORD/
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...authentication,
        DATABASE_URL: "mysql://localhost/eng_base",
      }),
    /PostgreSQL/
  );
});

test("API environment Interface rejects missing, weak, or reused JWT secrets", () => {
  assert.throws(
    () =>
      validateEnvironment({ DATABASE_URL: "postgresql://localhost/eng_base" }),
    /JWT_ACCESS_SECRET/
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgresql://localhost/eng_base",
        JWT_ACCESS_SECRET: "short",
        JWT_REFRESH_SECRET: "also-short",
      }),
    /at least 32 characters/
  );
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgresql://localhost/eng_base",
        JWT_ACCESS_SECRET: "same-secret-that-is-long-enough-123",
        JWT_REFRESH_SECRET: "same-secret-that-is-long-enough-123",
      }),
    /must be different/
  );
});

test("API environment Interface rejects an empty licensed content root", () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: "postgresql://localhost/eng_base",
        JWT_ACCESS_SECRET: "access-secret-that-is-long-enough-123",
        JWT_REFRESH_SECRET: "refresh-secret-that-is-long-enough-456",
        LICENSED_CONTENT_ROOT: "   ",
      }),
    /LICENSED_CONTENT_ROOT/
  );
});
