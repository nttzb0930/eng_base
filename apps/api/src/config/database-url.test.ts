import assert from "node:assert/strict";
import test from "node:test";

import { resolveDatabaseUrl } from "./database-url";

const components = {
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_USER: "postgres",
  DB_PASSWORD: "local password",
  DB_NAME: "eng/base",
  DB_SCHEMA: "app schema",
};

test("resolved PostgreSQL DATABASE_URL overrides component values", () => {
  const databaseUrl = "postgresql://override:secret@database:5433/primary";

  assert.equal(
    resolveDatabaseUrl({ ...components, DATABASE_URL: databaseUrl }),
    databaseUrl
  );
});

test("an unresolved DATABASE_URL template falls back to encoded components", () => {
  assert.equal(
    resolveDatabaseUrl({
      ...components,
      DATABASE_URL:
        "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}",
    }),
    "postgresql://postgres:local%20password@localhost:5432/eng%2Fbase?schema=app%20schema"
  );
});

test("a missing DATABASE_URL falls back to components", () => {
  assert.equal(
    resolveDatabaseUrl({
      DB_HOST: "database",
      DB_PORT: "5432",
      DB_USER: "app@user",
      DB_PASSWORD: "p@ss/word",
      DB_NAME: "eng_base",
      DB_SCHEMA: "public",
    }),
    "postgresql://app%40user:p%40ss%2Fword@database:5432/eng_base?schema=public"
  );
});

test("component construction reports missing values", () => {
  assert.throws(
    () => resolveDatabaseUrl({ ...components, DB_PASSWORD: undefined }),
    /DB_PASSWORD/
  );
});

test("component construction rejects invalid ports", () => {
  for (const port of ["0", "65536", "not-a-port"]) {
    assert.throws(
      () => resolveDatabaseUrl({ ...components, DB_PORT: port }),
      /DB_PORT/
    );
  }
});

test("resolved overrides reject non-PostgreSQL protocols", () => {
  assert.throws(
    () => resolveDatabaseUrl({ DATABASE_URL: "mysql://localhost/eng_base" }),
    /PostgreSQL/
  );
});
