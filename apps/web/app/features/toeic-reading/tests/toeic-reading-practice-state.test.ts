import assert from "node:assert/strict";
import test from "node:test";

import {
  applyToeicReadingPracticeGrade,
  createToeicReadingPracticeUiState,
  failToeicReadingPracticeGrade,
  selectToeicReadingPracticeOption,
} from "../toeic-reading-practice-state";

test("pending selection survives a grade failure", () => {
  const selected = selectToeicReadingPracticeOption(
    createToeicReadingPracticeUiState(101),
    101,
    1001
  );
  const failed = failToeicReadingPracticeGrade(selected, 101);

  assert.equal(failed.pendingOptionByQuestion[101], 1001);
  assert.equal(failed.failedQuestionId, 101);
});

test("graded feedback clears pending and failed state", () => {
  const failed = failToeicReadingPracticeGrade(
    selectToeicReadingPracticeOption(
      createToeicReadingPracticeUiState(101),
      101,
      1001
    ),
    101
  );
  const graded = applyToeicReadingPracticeGrade(failed, {
    questionId: 101,
    selectedOptionId: 1001,
  });

  assert.equal(graded.pendingOptionByQuestion[101], undefined);
  assert.equal(graded.failedQuestionId, null);
});

test("moving questions preserves pending choices for retry", () => {
  const first = selectToeicReadingPracticeOption(
    createToeicReadingPracticeUiState(101),
    101,
    1001
  );
  const second = { ...first, activeQuestionId: 102 };

  assert.equal(second.pendingOptionByQuestion[101], 1001);
  assert.equal(second.activeQuestionId, 102);
});
