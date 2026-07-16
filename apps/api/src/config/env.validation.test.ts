import assert from "node:assert/strict";
import test from "node:test";

import { validateEnvironment } from "./env.validation";

test("API environment Interface validates database configuration and defaults", () => {
  const configuration = validateEnvironment({
    DATABASE_URL: "postgresql://localhost/lingo",
  });

  assert.equal(configuration.API_PORT, 4000);
  assert.equal(
    configuration.CORS_ORIGINS,
    "http://localhost:3000,http://localhost:3001"
  );
});

test("API environment Interface rejects a missing database URL", () => {
  assert.throws(() => validateEnvironment({}), /DATABASE_URL/);
});
