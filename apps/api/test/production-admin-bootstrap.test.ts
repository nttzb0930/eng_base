import assert from "node:assert/strict";
import test from "node:test";

import { readProductionAdminConfig } from "../scripts/production-admin-bootstrap-config";

test("production admin bootstrap requires all credentials", () => {
  assert.throws(
    () => readProductionAdminConfig({ ADMIN_BOOTSTRAP_EMAIL: "admin@example.com" }),
    /ADMIN_BOOTSTRAP_USERNAME.*ADMIN_BOOTSTRAP_PASSWORD/u
  );
});

test("production admin bootstrap accepts a strong configured credential set", () => {
  assert.deepEqual(
    readProductionAdminConfig({
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
      ADMIN_BOOTSTRAP_USERNAME: "admin",
      ADMIN_BOOTSTRAP_PASSWORD: "a-secure-production-password",
      ADMIN_BOOTSTRAP_FULL_NAME: "Production Admin",
    }),
    {
      email: "admin@example.com",
      username: "admin",
      password: "a-secure-production-password",
      fullName: "Production Admin",
    }
  );
});

