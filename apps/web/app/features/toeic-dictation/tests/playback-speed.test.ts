import assert from "node:assert/strict";
import test from "node:test";

import {
  TOEIC_DICTATION_PLAYBACK_SPEEDS,
  formatToeicDictationPlaybackSpeed,
} from "../playback-speed";

test("dictation playback speeds expose the supported dropdown range", () => {
  assert.deepEqual(TOEIC_DICTATION_PLAYBACK_SPEEDS, [
    0.7,
    0.8,
    0.9,
    1,
    1.1,
    1.2,
    1.3,
    1.4,
  ]);
  assert.equal(formatToeicDictationPlaybackSpeed(1), "1x");
  assert.equal(formatToeicDictationPlaybackSpeed(1.4), "1.4x");
});
