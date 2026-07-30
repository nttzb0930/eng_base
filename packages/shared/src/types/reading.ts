import type {
  ReadingCefrLevel,
  ReadingPublicationStatus,
} from "../constants/reading.js";

export type ReadingOptionInput = {
  text: string;
  order: number;
  correct: boolean;
};

export type ReadingQuestionInput = {
  prompt: string;
  order: number;
  options: ReadingOptionInput[];
};

export type CreateReadingPassagePayload = {
  slug: string;
  title: string;
  body: string;
  cefrLevel: ReadingCefrLevel;
  topicId: number | null;
  estimatedMinutes: number;
  questions: ReadingQuestionInput[];
};

export type UpdateReadingPassagePayload = Omit<
  CreateReadingPassagePayload,
  "slug"
>;

export type ReadingTopicOption = {
  id: number;
  title: string;
};

export type AdminReadingOption = ReadingOptionInput & {
  id: number;
};

export type AdminReadingQuestion = Omit<ReadingQuestionInput, "options"> & {
  id: number;
  options: AdminReadingOption[];
};

export type AdminReadingPassage = Omit<
  CreateReadingPassagePayload,
  "questions"
> & {
  id: number;
  status: ReadingPublicationStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  topicTitle: string | null;
  questions: AdminReadingQuestion[];
};

export type ReadingAttemptSummary = {
  id: number;
  passageId: number;
  passageTitle: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  submittedAt: string;
};

export type ReadingPassageSummary = {
  id: number;
  slug: string;
  title: string;
  cefrLevel: ReadingCefrLevel;
  topicTitle: string | null;
  estimatedMinutes: number;
  questionCount: number;
  latestAttempt: ReadingAttemptSummary | null;
};

export type ReadingLearnerOption = {
  id: number;
  text: string;
  order: number;
};

export type ReadingLearnerQuestion = {
  id: number;
  prompt: string;
  order: number;
  options: ReadingLearnerOption[];
};

export type ReadingPassageDetail = Omit<
  ReadingPassageSummary,
  "questionCount" | "latestAttempt"
> & {
  body: string;
  questions: ReadingLearnerQuestion[];
};

export type ReadingSubmissionPayload = {
  submissionKey: string;
  answers: Array<{
    questionId: number;
    optionId: number;
  }>;
};

export type ReadingAttemptAnswerResult = {
  questionId: number;
  question: string;
  selectedOption: string;
  correctOption: string;
  correct: boolean;
};

export type ReadingAttemptResult = ReadingAttemptSummary & {
  answers: ReadingAttemptAnswerResult[];
};
