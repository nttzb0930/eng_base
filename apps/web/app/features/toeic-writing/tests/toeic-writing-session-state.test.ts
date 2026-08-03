import assert from "node:assert/strict";
import test from "node:test";

import {
  initialToeicWritingSessionState,
  reduceWritingSession,
} from "../toeic-writing-session-state";

test("editing keeps learner text and marks the draft dirty", () => {
  const state = reduceWritingSession(initialToeicWritingSessionState, {
    type: "edit",
    value: "The worker is checking a report.",
  });

  assert.equal(state.responseText, "The worker is checking a report.");
  assert.equal(state.saveStatus, "IDLE");
});

test("save failure keeps editor text and marks not-saved", () => {
  const state = reduceWritingSession(
    {
      ...initialToeicWritingSessionState,
      responseText: "learner text",
    },
    { type: "save-failed" }
  );

  assert.equal(state.responseText, "learner text");
  assert.equal(state.saveStatus, "ERROR");
});

test("draft hydration does not replace text after the learner has edited", () => {
  const edited = reduceWritingSession(initialToeicWritingSessionState, {
    type: "edit",
    value: "new local response",
  });
  const hydrated = reduceWritingSession(edited, {
    type: "hydrate",
    value: "older server draft",
  });

  assert.equal(hydrated.responseText, "new local response");
});
