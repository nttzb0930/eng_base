import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { MODULE_METADATA } from "@nestjs/common/constants";

import { ToeicListeningController } from "../toeic-listening.controller";
import { ToeicListeningMediaController } from "../toeic-listening-media.controller";
import { ToeicListeningModule } from "../toeic-listening.module";

test("Listening module registers learner read and media controllers", () => {
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    ToeicListeningModule
  ) as unknown[];
  assert.ok(controllers.includes(ToeicListeningController));
  assert.ok(controllers.includes(ToeicListeningMediaController));
});

test("AppModule composes the Listening capability", () => {
  const source = readFileSync(
    resolve(__dirname, "../../../app.module.ts"),
    "utf8"
  );
  assert.match(source, /ToeicListeningModule/u);
});
