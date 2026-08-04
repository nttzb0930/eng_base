import assert from "node:assert/strict";
import test from "node:test";

import {
  partTwoRubricCases,
  partTwoRubricTask,
} from "../../src/module/toeic-writing/tests/fixtures/part-two-rubric-cases";
import {
  runPartTwoGradingSmoke,
  type PartTwoGradingSmokeDependencies,
} from "./smoke-part-two-grading";

test("Part 2 smoke requires an explicit task id", async () => {
  await assert.rejects(
    () => runPartTwoGradingSmoke([], dependencies()),
    /task-id/u
  );
});

test("Part 2 dry run validates configuration, prompt, and schema without provider traffic", async () => {
  let calls = 0;
  const logs: unknown[] = [];
  const result = await runPartTwoGradingSmoke(
    ["--task-id=49"],
    dependencies({
      grade: async () => {
        calls += 1;
        return partTwoRubricCases[4]!.providerResult;
      },
      log: (value) => logs.push(value),
    })
  );
  assert.equal(calls, 0);
  assert.equal(result.providerCalled, false);
  assert.equal(result.schemaValid, true);
  assert.equal(result.quotaCharged, false);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /sourceEmail|responseText|api.?key|learner-response/iu
  );
});

test("Part 2 provider call is opt-in and fails when Gemini is disabled", async () => {
  await assert.rejects(
    () =>
      runPartTwoGradingSmoke(
        ["--task-id=49", "--call-provider"],
        dependencies()
      ),
    /explicitly enabled/u
  );
});

test("Part 2 smoke rejects mismatched Unicode evidence offsets", async () => {
  const invalid = structuredClone(partTwoRubricCases[4]!.providerResult);
  invalid.taskCompletion.requirements[0]!.evidence[0]!.start += 1;
  await assert.rejects(
    () =>
      runPartTwoGradingSmoke(
        ["--task-id=49", "--call-provider"],
        dependencies({
          providerEnabled: true,
          grade: async () => invalid,
        })
      ),
    /invalid structured response/iu
  );
});

function dependencies(
  overrides: Partial<PartTwoGradingSmokeDependencies> = {}
): PartTwoGradingSmokeDependencies {
  return {
    providerEnabled: false,
    model: "gemini-test",
    loadTask: async () => partTwoRubricTask,
    grade: async () => partTwoRubricCases[4]!.providerResult,
    now: () => 100,
    log: () => undefined,
    ...overrides,
  };
}
