import assert from "node:assert/strict";
import test from "node:test";

import { WritingAiObservabilityService } from "../observability/writing-ai-observability.service";

test("Writing AI observability forwards only aggregate-safe dimensions", () => {
  const calls: unknown[][] = [];
  const service = new WritingAiObservabilityService({
    info: (...args: unknown[]) => calls.push(args),
  } as never);

  service.record({
    name: "grade_completed",
    part: 1,
    model: "gemini-3.5-flash-lite",
    outcome: "SUCCESS",
    cacheHit: false,
    quotaCharged: true,
    responseText: "private answer",
    prompt: "private prompt",
    providerResponse: "private response",
    apiKey: "secret",
    email: "learner@example.com",
  } as never);

  const serialized = JSON.stringify(calls);
  assert.match(serialized, /grade_completed/u);
  assert.doesNotMatch(
    serialized,
    /private answer|private prompt|private response|secret|learner@example/u
  );
});
