import assert from "node:assert/strict";
import test from "node:test";

import * as guardModule from "./development-seed-guard.js";

test("development seed rejects production before database access", () => {
  const guard = (
    guardModule as typeof guardModule & {
      assertDevelopmentSeedAllowed?: (environment: NodeJS.ProcessEnv) => void;
    }
  ).assertDevelopmentSeedAllowed;

  assert.throws(
    () => guard?.({ NODE_ENV: "production" }),
    /development-only/iu
  );
});

test("development seed accepts an explicit non-production environment", () => {
  assert.doesNotThrow(() =>
    guardModule.assertDevelopmentSeedAllowed({ NODE_ENV: "development" })
  );
});
