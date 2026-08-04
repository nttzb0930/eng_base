import assert from "node:assert/strict";
import test from "node:test";

import {
  answerGrammarQuestionFailed,
  answerGrammarQuestionSucceeded,
  beginGrammarAnswer,
  createToeicGrammarSessionState,
  moveGrammarQuestion,
  retryGrammarAnswer,
  selectGrammarQuestion,
} from "../toeic-grammar-session-state";

const questionIds = [11, 12, 13];
const result = {
  questionId: 12,
  selectedOptionId: 122,
  correctOptionId: 121,
  correctOptionLabel: "A",
  correctOptionText: "between",
  correct: false,
  explanationVi: null,
  explanationEn: null,
  questionTranslation: null,
  answerTranslation: null,
  vocabulary: [],
  questionProgress: {
    attempted: true,
    lastSelectedOptionId: 122,
    lastCorrect: false,
  },
  collectionProgress: {
    questionCount: 3,
    correctCount: 0,
    incorrectCount: 1,
    unansweredCount: 2,
  },
};

test("session starts at the backend-selected first unanswered question", () => {
  const state = createToeicGrammarSessionState(questionIds, 1);
  assert.equal(state.activeQuestionId, 12);
  assert.equal(moveGrammarQuestion(state, questionIds, 1).activeQuestionId, 13);
  assert.equal(
    selectGrammarQuestion(state, questionIds, 99).activeQuestionId,
    12
  );
});

test("failed grading retains the same submission key for explicit retry", () => {
  const initial = createToeicGrammarSessionState(questionIds, 0);
  const pending = beginGrammarAnswer(
    initial,
    12,
    122,
    "00000000-0000-4000-8000-000000000001"
  );
  const failed = answerGrammarQuestionFailed(pending);

  assert.deepEqual(retryGrammarAnswer(failed), {
    questionId: 12,
    selectedOptionId: 122,
    submissionKey: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(beginGrammarAnswer(failed, 13, 131, "new"), failed);
});

test("successful grading locks feedback for the current interaction", () => {
  const initial = createToeicGrammarSessionState(questionIds, 1);
  const pending = beginGrammarAnswer(initial, 12, 122, "key");
  const completed = answerGrammarQuestionSucceeded(pending, result);

  assert.equal(completed.pendingAnswer, null);
  assert.equal(completed.feedback[12]?.correct, false);
  assert.equal(beginGrammarAnswer(completed, 12, 121, "other"), completed);
});
