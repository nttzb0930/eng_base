import type { ToeicListeningVocabularySuggestion } from "./toeic-listening.js";

export type ToeicReadingPart = 5 | 6 | 7;

export type ToeicReadingVocabularySuggestion =
  ToeicListeningVocabularySuggestion;

export type ToeicReadingPartSummary = {
  part: ToeicReadingPart;
  questionCount: number;
};

export type ToeicReadingDraftAnswer = {
  questionId: number;
  optionId: number;
};

export type ToeicReadingDraftPayload = {
  sourceVersion: string;
  practicePart?: ToeicReadingPart;
  activeQuestionId: number;
  answers: ToeicReadingDraftAnswer[];
  reviewQuestionIds: number[];
};

export type ToeicReadingDraft = ToeicReadingDraftPayload & {
  testId: number;
  updatedAt: string;
  expiresAt: string;
};

export type ToeicReadingDraftProgress = {
  answeredCount: number;
  totalCount: number;
  activeQuestionId: number;
  updatedAt: string;
};

export type ToeicReadingAttemptSummary = {
  id: number;
  testId: number;
  testTitle: string;
  practicePart: ToeicReadingPart | null;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  submittedAt: string;
};

export type ToeicReadingOverview = {
  readingAvailable: boolean;
  listeningAvailable: boolean;
  publishedTestCount: number;
  totalQuestionCount: number;
  parts: ToeicReadingPartSummary[];
  recentAttempts: ToeicReadingAttemptSummary[];
};

export type ToeicReadingTestSummary = {
  id: number;
  title: string;
  sourceSetName: string;
  sourceVersion: string;
  questionCount: number;
  parts: ToeicReadingPartSummary[];
  draftProgress: ToeicReadingDraftProgress | null;
  latestAttempt: ToeicReadingAttemptSummary | null;
};

export type ToeicReadingLearnerOption = {
  id: number;
  label: string;
  text: string;
};

export type ToeicReadingLearnerQuestion = {
  id: number;
  number: number;
  part: ToeicReadingPart;
  stimulusId: number | null;
  prompt: string;
  translation: string | null;
  options: ToeicReadingLearnerOption[];
};

export type ToeicReadingStimulus = {
  id: number;
  part: ToeicReadingPart;
  kind: string;
  body: string | null;
  translation: string | null;
};

export type ToeicReadingTestPart = ToeicReadingPartSummary & {
  stimuli: ToeicReadingStimulus[];
  questions: ToeicReadingLearnerQuestion[];
};

export type ToeicReadingTestDetail = {
  id: number;
  title: string;
  sourceSetName: string;
  sourceVersion: string;
  questionCount: number;
  parts: ToeicReadingTestPart[];
};

export type ToeicReadingSubmissionPayload = {
  submissionKey: string;
  testId: number;
  sourceVersion: string;
  practicePart?: ToeicReadingPart;
  answers: Array<{
    questionId: number;
    optionId: number;
  }>;
};

export type ToeicReadingAttemptAnswerResult = {
  questionId: number;
  questionNumber: number;
  part: ToeicReadingPart;
  question: string;
  selectedOptionLabel: string;
  selectedOption: string;
  correctOptionLabel: string;
  correctOption: string;
  explanation: string | null;
  correct: boolean;
};

export type ToeicReadingPartResult = {
  part: ToeicReadingPart;
  correctCount: number;
  totalCount: number;
  accuracy: number;
};

export type ToeicReadingAttemptResult = ToeicReadingAttemptSummary & {
  sourceVersion: string;
  parts: ToeicReadingPartResult[];
  answers: ToeicReadingAttemptAnswerResult[];
};

export type ToeicReadingPracticeStartPayload = {
  testId: number;
  part: ToeicReadingPart;
  sourceVersion: string;
};

export type ToeicReadingPracticeAnswerPayload = {
  questionId: number;
  optionId: number;
  requestKey: string;
};

export type ToeicReadingPracticeUpdatePayload = {
  activeQuestionId: number;
  reviewQuestionIds: number[];
};

export type ToeicReadingPracticeProgress = {
  correct: number;
  incorrect: number;
  answered: number;
  total: number;
};

export type ToeicReadingPracticeAnswerResult = {
  questionId: number;
  selectedOptionId: number;
  correct: boolean;
  correctOption: ToeicReadingLearnerOption;
  explanation: string | null;
  questionTranslation: string | null;
  answerTranslations: Array<{ label: string; text: string }>;
  vocabulary: ToeicReadingVocabularySuggestion[];
  progress: ToeicReadingPracticeProgress;
  nextQuestionId: number | null;
};

export type ToeicReadingPracticeSession = {
  id: number;
  testId: number;
  part: ToeicReadingPart;
  sourceVersion: string;
  status: "ACTIVE" | "COMPLETED";
  activeQuestionId: number;
  reviewQuestionIds: number[];
  content: ToeicReadingTestDetail;
  answers: ToeicReadingPracticeAnswerResult[];
  progress: ToeicReadingPracticeProgress;
  updatedAt: string;
  completedAt: string | null;
};

export type ToeicReadingPracticeSummary = {
  sessionId: number;
  progress: ToeicReadingPracticeProgress;
  incorrectQuestionIds: number[];
  completedAt: string;
};
