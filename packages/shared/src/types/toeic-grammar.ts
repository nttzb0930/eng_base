export type ToeicGrammarPracticeMode = "topic" | "subtopic" | "set" | "level";

export type ToeicGrammarProgressSummary = {
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
};

export type ToeicGrammarCollectionSummary = ToeicGrammarProgressSummary & {
  target: string;
  titleEn: string | null;
  titleVi: string;
  descriptionVi: string | null;
};

export type ToeicGrammarSubtopicSummary = ToeicGrammarCollectionSummary & {
  accessLevel: string | null;
};

export type ToeicGrammarTopicSummary = ToeicGrammarCollectionSummary & {
  icon: string | null;
  subtopics: ToeicGrammarSubtopicSummary[];
};

export type ToeicGrammarSetSummary = ToeicGrammarCollectionSummary & {
  year: number | null;
  accessLevel: string | null;
};

export type ToeicGrammarLevelSummary = ToeicGrammarProgressSummary & {
  target: string;
  level: 1 | 2 | 3 | 4 | 5;
};

export type ToeicGrammarCatalog = {
  available: boolean;
  snapshotVersion: string | null;
  topics: ToeicGrammarTopicSummary[];
  sets: ToeicGrammarSetSummary[];
  levels: ToeicGrammarLevelSummary[];
};

export type ToeicGrammarLessonBlock = {
  target: string;
  titleEn: string | null;
  titleVi: string;
  contentType: string;
  theoryContentEn: string | null;
  theoryContentVi: string | null;
  structuredContent: unknown | null;
};

export type ToeicGrammarSubtopicDetail = {
  snapshotVersion: string;
  topicTarget: string;
  topicTitleEn: string | null;
  topicTitleVi: string;
  target: string;
  titleEn: string | null;
  titleVi: string;
  descriptionVi: string | null;
  lessons: ToeicGrammarLessonBlock[];
  progress: ToeicGrammarProgressSummary;
};

export type ToeicGrammarLearnerOption = {
  id: number;
  label: string;
  text: string;
};

export type ToeicGrammarQuestionProgress = {
  attempted: boolean;
  lastSelectedOptionId: number | null;
  lastCorrect: boolean | null;
};

export type ToeicGrammarLearnerQuestion = {
  id: number;
  number: number | null;
  prompt: string;
  options: ToeicGrammarLearnerOption[];
  progress: ToeicGrammarQuestionProgress;
};

export type ToeicGrammarPractice = {
  snapshotVersion: string;
  mode: ToeicGrammarPracticeMode;
  target: string;
  titleEn: string | null;
  titleVi: string;
  progress: ToeicGrammarProgressSummary;
  initialQuestionIndex: number;
  questions: ToeicGrammarLearnerQuestion[];
};

export type ToeicGrammarAnswerPayload = {
  submissionKey: string;
  snapshotVersion: string;
  mode: ToeicGrammarPracticeMode;
  target: string;
  questionId: number;
  selectedOptionId: number;
};

export type ToeicGrammarVocabularyEntry = string | Record<string, unknown>;

export type ToeicGrammarAnswerResult = {
  questionId: number;
  selectedOptionId: number;
  correctOptionId: number;
  correctOptionLabel: string;
  correctOptionText: string;
  correct: boolean;
  explanationVi: string | null;
  explanationEn: string | null;
  questionTranslation: string | null;
  answerTranslation: string | null;
  vocabulary: ToeicGrammarVocabularyEntry[];
  questionProgress: ToeicGrammarQuestionProgress;
  collectionProgress: ToeicGrammarProgressSummary;
};
