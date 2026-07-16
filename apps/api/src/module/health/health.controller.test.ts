import assert from "node:assert/strict";
import test from "node:test";

import { HealthController } from "./health.controller";

test("health interface reports that the API is available", () => {
  const controller = new HealthController();

  assert.deepEqual(controller.getHealth(), {
    status: "ok",
    service: "lingo-api",
  });
});
