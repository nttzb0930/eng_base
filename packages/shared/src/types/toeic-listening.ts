export type ToeicListeningPart = 1 | 2 | 3 | 4;

export type ToeicListeningPartSummary = {
  part: ToeicListeningPart;
  questionCount: number;
};

export type ToeicListeningDraftAnswer = {
  questionId: number;
  optionId: number;
};
export type ToeicListeningDraftPayload = {
  listeningSourceVersion: string;
  practicePart?: ToeicListeningPart;
  activeQuestionId: number;
  answers: ToeicListeningDraftAnswer[];
  reviewQuestionIds: number[];
  completedMediaIds: number[];
  activeMediaId: number | null;
  playbackPositionMs: number;
};
export type ToeicListeningDraft = ToeicListeningDraftPayload & {
  testId: number;
  updatedAt: string;
  expiresAt: string;
};
export type ToeicListeningDraftProgress = {
  answeredCount: number;
  totalCount: number;
  activeQuestionId: number;
  updatedAt: string;
};

export type ToeicListeningOverview = {
  listeningAvailable: boolean;
  publishedTestCount: number;
  totalQuestionCount: number;
  parts: ToeicListeningPartSummary[];
};

export type ToeicListeningTestSummary = {
  id: number;
  title: string;
  sourceSetName: string;
  listeningSourceVersion: string;
  questionCount: number;
  parts: ToeicListeningPartSummary[];
  draftProgress: ToeicListeningDraftProgress | null;
  latestAttempt: ToeicListeningAttemptSummary | null;
};

export type ToeicListeningLearnerOption = {
  id: number;
  label: string;
  text: string | null;
};

export type ToeicListeningLearnerQuestion = {
  id: number;
  number: number;
  part: ToeicListeningPart;
  stimulusId: number | null;
  prompt: string | null;
  audioMediaId: number | null;
  imageMediaIds: number[];
  options: ToeicListeningLearnerOption[];
};

export type ToeicListeningLearnerStimulus = {
  id: number;
  part: ToeicListeningPart;
  audioMediaId: number | null;
  imageMediaIds: number[];
};

export type ToeicListeningTestPart = ToeicListeningPartSummary & {
  stimuli: ToeicListeningLearnerStimulus[];
  questions: ToeicListeningLearnerQuestion[];
};

export type ToeicListeningTestDetail = {
  id: number;
  title: string;
  sourceSetName: string;
  listeningSourceVersion: string;
  questionCount: number;
  parts: ToeicListeningTestPart[];
};

export type ToeicListeningAnswerCheckPayload = {
  listeningSourceVersion: string;
  practicePart: ToeicListeningPart;
  questionId: number;
  optionId: number;
};

export type ToeicVocabularyTranslationPair = {
  en: string;
  vi: string;
};

export type ToeicListeningVocabularySuggestion = {
  word: string;
  lemma: string | null;
  pos: string;
  meaningVi: string;
  cefrLevel: string;
  ipaUs: string | null;
  ipaUk: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  collocations: ToeicVocabularyTranslationPair[];
  synonym: ToeicVocabularyTranslationPair | null;
};

export type ToeicListeningAnswerCheckResult = {
  questionId: number;
  selectedOptionId: number;
  correctOptionId: number;
  correctOptionLabel: string;
  correctOptionText: string;
  correct: boolean;
  questionTranslation: string | null;
  answerTranslations: Array<{ label: string; text: string }>;
  transcript: string | null;
  transcriptTranslation: string | null;
  explanation: string | null;
  vocabulary: ToeicListeningVocabularySuggestion[];
};

export type ToeicListeningSubmissionPayload = {
  submissionKey: string;
  testId: number;
  listeningSourceVersion: string;
  practicePart?: ToeicListeningPart;
  answers: Array<{ questionId: number; optionId: number }>;
};

export type ToeicListeningAttemptSummary = {
  id: number;
  testId: number;
  testTitle: string;
  practicePart: ToeicListeningPart | null;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  submittedAt: string;
};

export type ToeicListeningAttemptAnswerResult = {
  questionId: number;
  questionNumber: number;
  part: ToeicListeningPart;
  question: string;
  transcript: string | null;
  transcriptTranslation: string | null;
  audioMediaId: number | null;
  imageMediaIds: number[];
  stimulus: {
    id: number;
    transcript: string | null;
    transcriptTranslation: string | null;
    audioMediaId: number | null;
    imageMediaIds: number[];
  } | null;
  selectedOptionLabel: string;
  selectedOption: string;
  correctOptionLabel: string;
  correctOption: string;
  explanation: string | null;
  correct: boolean;
};

export type ToeicListeningPartResult = {
  part: ToeicListeningPart;
  correctCount: number;
  totalCount: number;
  accuracy: number;
};

export type ToeicListeningAttemptResult = ToeicListeningAttemptSummary & {
  listeningSourceVersion: string;
  parts: ToeicListeningPartResult[];
  answers: ToeicListeningAttemptAnswerResult[];
};
