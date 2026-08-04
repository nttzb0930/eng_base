import assert from "node:assert/strict";
import test from "node:test";

import type {
  ToeicListeningDraft,
  ToeicListeningTestDetail,
} from "@repo/shared";

import {
  buildToeicListeningSubmissionAnswers,
  groupToeicListeningQuestions,
  restoreToeicListeningSessionState,
  selectToeicListeningAnswer,
  toggleToeicListeningReview,
} from "../toeic-listening-session-state";

test("draft restore keeps only current questions and media", () => {
  const draft = {
    activeQuestionId: 999,
    answers: [
      { questionId: 11, optionId: 101 },
      { questionId: 999, optionId: 102 },
    ],
    reviewQuestionIds: [999, 12],
    completedMediaIds: [501, 999],
    activeMediaId: 999,
    playbackPositionMs: 4200,
  } as ToeicListeningDraft;

  assert.deepEqual(
    restoreToeicListeningSessionState(draft, [11, 12], [501, 502]),
    {
      activeQuestionId: 11,
      answers: { 11: 101 },
      reviewQuestionIds: [12],
      completedMediaIds: [501],
      activeMediaId: null,
      playbackPositionMs: 0,
    }
  );
});

test("answers and review markers update independently", () => {
  const initial = restoreToeicListeningSessionState(null, [11], [501]);
  const answered = selectToeicListeningAnswer(initial, 11, 101);
  const marked = toggleToeicListeningReview(answered, 11);
  assert.equal(marked.answers[11], 101);
  assert.deepEqual(marked.reviewQuestionIds, [11]);
  assert.deepEqual(buildToeicListeningSubmissionAnswers(marked, [11]), [
    { questionId: 11, optionId: 101 },
  ]);
});

test("Part 1 and 2 stay single while Part 3 and 4 group by stimulus", () => {
  const detail = {
    parts: [
      {
        part: 1,
        questions: [{ id: 11, number: 1, stimulusId: null }],
        stimuli: [],
      },
      {
        part: 3,
        questions: [
          { id: 31, number: 32, stimulusId: 701 },
          { id: 32, number: 33, stimulusId: 701 },
          { id: 33, number: 34, stimulusId: 701 },
        ],
        stimuli: [{ id: 701, part: 3 }],
      },
    ],
  } as ToeicListeningTestDetail;
  const groups = groupToeicListeningQuestions(detail);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.questions.map((question) => question.id)),
    [[11], [31, 32, 33]]
  );
});
