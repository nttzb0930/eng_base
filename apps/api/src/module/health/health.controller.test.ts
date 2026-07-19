import assert from "node:assert/strict";
import test from "node:test";

import { HealthController } from "./health.controller";

test("health interface reports that the API is available", () => {
  const ControllerWithApplicationConfig =
    HealthController as unknown as new (application: {
      serviceName: string;
    }) => HealthController;
  const controller = new ControllerWithApplicationConfig({
    serviceName: "eng-base-api-test",
  });

  assert.deepEqual(controller.getHealth(), {
    status: "ok",
    service: "eng-base-api-test",
  });
});
