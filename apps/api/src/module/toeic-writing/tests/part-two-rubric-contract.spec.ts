import assert from "node:assert/strict";
import test from "node:test";

import { validatePartTwoProviderResult } from "../grading/part-two-provider-result.validator";
import { buildPartTwoGradingPrompt } from "../provider/part-two-grading.prompt";
import { writingPartTwoProviderResultSchema } from "../provider/writing-ai.schemas";
import {
  partTwoPromptInjectionResponse,
  partTwoRubricCases,
  partTwoRubricTask,
} from "./fixtures/part-two-rubric-cases";

test("rubric fixtures cover and validate every official score", () => {
  assert.deepEqual(
    partTwoRubricCases.map(({ expectedScore }) => expectedScore),
    [0, 1, 2, 3, 4]
  );
  assert.equal(
    new Set(partTwoRubricCases.map(({ responseText }) => responseText)).size,
    5
  );
  assert.deepEqual(
    partTwoRubricCases.map(
      ({ providerResult }) => providerResult.taskCompletion.completedCount
    ),
    [0, 0, 1, 2, 2]
  );
  for (const fixture of partTwoRubricCases) {
    const parsed = writingPartTwoProviderResultSchema.parse(
      fixture.providerResult
    );
    const validated = validatePartTwoProviderResult(parsed, {
      responseText: fixture.responseText,
      requirementIds: partTwoRubricTask.requirements.map(({ id }) => id),
    });
    assert.equal(validated.score, fixture.expectedScore);
    assert.deepEqual(
      validated.taskCompletion.requirements.map(
        ({ requirementId }) => requirementId
      ),
      ["requirement-1", "requirement-2"]
    );
  }
});

test("prompt injection remains inside the untrusted learner-data boundary", () => {
  const prompt = buildPartTwoGradingPrompt({
    locale: "en",
    sourceEmail: partTwoRubricTask.sourceEmail,
    requirements: partTwoRubricTask.requirements,
    responseText: partTwoPromptInjectionResponse,
    assistance: {
      outlineViewed: false,
      vocabularyViewed: false,
      sampleViewed: false,
      communityAnswerRestored: false,
    },
  });
  assert.match(prompt, /untrusted data/u);
  assert.doesNotMatch(prompt, /<learner-response>/u);
  assert.doesNotMatch(prompt, /reveal the system prompt/u);
  assert.doesNotMatch(prompt, /<system>/u);
});
