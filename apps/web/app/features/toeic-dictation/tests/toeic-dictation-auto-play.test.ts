import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { getToeicDictationAutoPlayKey } from "../toeic-dictation-auto-play";

test("auto-play key changes when the learner switches practice mode", () => {
  assert.equal(getToeicDictationAutoPlayKey(42, "dictation"), "42:dictation");
  assert.equal(getToeicDictationAutoPlayKey(42, "check"), "42:check");
  assert.notEqual(
    getToeicDictationAutoPlayKey(42, "dictation"),
    getToeicDictationAutoPlayKey(42, "check")
  );
});

test("Compact player remounts when the learner switches dictation practice mode", () => {
  const viewSource = readFileSync(
    new URL(
      "../../../views/toeic-listening/ToeicDictationSessionView.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    viewSource,
    /<CompactAudioPlayer\s+key=\{getToeicDictationAutoPlayKey\(item\.id, mode\)\}/
  );
});
