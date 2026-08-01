import assert from "node:assert/strict";
import test from "node:test";

import {
  canReplayToeicListeningMedia,
  canSeekToeicListeningMedia,
  createToeicListeningPlaybackState,
  reduceToeicListeningPlayback,
} from "../toeic-listening-playback-policy";

test("Full mode cannot seek or restart consumed media", () => {
  let state = createToeicListeningPlaybackState();
  state = reduceToeicListeningPlayback(
    state,
    { type: "START", mediaId: 5 },
    "FULL"
  );
  state = reduceToeicListeningPlayback(
    state,
    { type: "ENDED", mediaId: 5 },
    "FULL"
  );
  assert.equal(canSeekToeicListeningMedia("FULL"), false);
  assert.equal(canReplayToeicListeningMedia(state, 5, "FULL"), false);
  assert.equal(
    reduceToeicListeningPlayback(state, { type: "START", mediaId: 5 }, "FULL"),
    state
  );
});

test("Practice mode supports replay and seek", () => {
  const state = {
    ...createToeicListeningPlaybackState(),
    completedMediaIds: [5],
  };
  assert.equal(canSeekToeicListeningMedia("PRACTICE"), true);
  assert.equal(canReplayToeicListeningMedia(state, 5, "PRACTICE"), true);
  assert.equal(
    reduceToeicListeningPlayback(
      state,
      { type: "START", mediaId: 5 },
      "PRACTICE"
    ).status,
    "LOADING"
  );
});

test("Full mode pauses and resumes the same incomplete media", () => {
  let state = reduceToeicListeningPlayback(
    createToeicListeningPlaybackState(),
    { type: "START", mediaId: 8 },
    "FULL"
  );
  state = reduceToeicListeningPlayback(
    state,
    { type: "PLAYING", mediaId: 8 },
    "FULL"
  );
  state = reduceToeicListeningPlayback(
    state,
    { type: "PAUSE", mediaId: 8, positionMs: 2100 },
    "FULL"
  );
  assert.equal(state.status, "PAUSED");
  assert.equal(state.positionMs, 2100);
  assert.equal(
    reduceToeicListeningPlayback(state, { type: "RESUME", mediaId: 8 }, "FULL")
      .status,
    "LOADING"
  );
});

test("network error retries only the same incomplete asset", () => {
  let state = reduceToeicListeningPlayback(
    createToeicListeningPlaybackState(),
    { type: "START", mediaId: 8 },
    "FULL"
  );
  state = reduceToeicListeningPlayback(
    state,
    { type: "ERROR", mediaId: 8 },
    "FULL"
  );
  assert.equal(state.status, "ERROR");
  assert.equal(
    reduceToeicListeningPlayback(state, { type: "RETRY", mediaId: 9 }, "FULL"),
    state
  );
  assert.equal(
    reduceToeicListeningPlayback(state, { type: "RETRY", mediaId: 8 }, "FULL")
      .status,
    "LOADING"
  );
});
