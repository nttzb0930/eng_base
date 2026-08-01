export type GrammarOptionLabel = "A" | "B" | "C" | "D";

export type ToeicGrammarQuestionOption = {
  label: GrammarOptionLabel;
  text: string;
  correct: boolean;
};

export type ToeicGrammarQuestion = {
  sourceQuestionId: string;
  sourceTopicId: string | null;
  sourceSubtopicId: string | null;
  questionNumber: number | null;
  questionText: string;
  options: ToeicGrammarQuestionOption[];
  explanationVi: string | null;
  explanationEn: string | null;
  questionTranslation: string | null;
  answerTranslation: string | null;
  vocabulary: unknown[];
  preferAiExplanation: boolean;
};

export type ToeicGrammarTopic = {
  sourceTopicId: string;
  titleEn: string | null;
  titleVi: string;
  descriptionVi: string | null;
  icon: string | null;
  orderIndex: number;
};

export type ToeicGrammarSubtopic = {
  sourceSubtopicId: string;
  sourceTopicId: string;
  titleEn: string | null;
  titleVi: string;
  descriptionVi: string | null;
  accessLevel: string | null;
  orderIndex: number;
};

export type ToeicGrammarLesson = {
  sourceLessonId: string;
  sourceSubtopicId: string;
  titleEn: string | null;
  titleVi: string;
  contentType: string;
  theoryContentEn: string | null;
  theoryContentVi: string | null;
  lessonContentJson: unknown | null;
  htmlContent: string | null;
  orderIndex: number;
};

export type ToeicGrammarSet = {
  sourceSetId: string;
  name: string;
  year: number | null;
  accessLevel: string | null;
  questionIds: string[];
};

export type ToeicGrammarDifficultyLevel = {
  level: number;
  questionIds: string[];
};

export type ToeicGrammarSnapshot = {
  schemaVersion: 2;
  source: "dautoeic";
  snapshotVersion: string;
  inventorySha256: string;
  contentSha256: string;
  topics: ToeicGrammarTopic[];
  subtopics: ToeicGrammarSubtopic[];
  lessons: ToeicGrammarLesson[];
  questions: ToeicGrammarQuestion[];
  sets: ToeicGrammarSet[];
  difficultyLevels: ToeicGrammarDifficultyLevel[];
};

export type GrammarSnapshotContent = Omit<
  ToeicGrammarSnapshot,
  "contentSha256"
> & { contentSha256?: string };

export type GrammarValidationResult =
  | { valid: true; errors: []; snapshot: ToeicGrammarSnapshot }
  | { valid: false; errors: string[] };

export type ToeicGrammarCatalog = {
  topics: ToeicGrammarTopic[];
  subtopics: ToeicGrammarSubtopic[];
};

export type ToeicGrammarSource = {
  readCatalog(): Promise<ToeicGrammarCatalog>;
  readLessons(sourceSubtopicIds: string[]): Promise<ToeicGrammarLesson[]>;
  readSets(): Promise<Array<Omit<ToeicGrammarSet, "questionIds">>>;
  readTopicQuestions(sourceTopicId: string): Promise<ToeicGrammarQuestion[]>;
  readSetQuestions(sourceSetId: string): Promise<ToeicGrammarQuestion[]>;
  readDifficultyQuestions(level: number): Promise<ToeicGrammarQuestion[]>;
};

export type ToeicGrammarInventory = {
  schemaVersion: 2;
  source: "dautoeic";
  inventorySha256: string;
  topics: ToeicGrammarTopic[];
  subtopics: ToeicGrammarSubtopic[];
  lessonIdsBySubtopic: Record<string, string[]>;
  topicQuestionIds: Record<string, string[]>;
  sets: ToeicGrammarSet[];
  difficultyLevels: ToeicGrammarDifficultyLevel[];
  counts: {
    topics: number;
    subtopics: number;
    lessons: number;
    sets: number;
    topicQuestions: number;
    setQuestions: number;
    difficultyQuestions: number;
  };
};
