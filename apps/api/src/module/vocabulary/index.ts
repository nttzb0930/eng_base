export { VocabularyModule } from "./vocabulary.module";
export { GetSavedVocabularyWordsUseCase } from "./use-cases/get-saved-vocabulary-words.use-case";
export { FindVocabularyInTextUseCase } from "./use-cases/find-vocabulary-in-text.use-case";
export type { VocabularyTextMatch } from "./use-cases/find-vocabulary-in-text.use-case";
export {
  getVocabularyLearnerState,
  summarizeVocabularyLearnerStates,
} from "./use-cases/vocabulary-learner-state.policy";
export {
  getBlankedExample,
  getDistractors,
  toReviewSourceItem,
} from "./builders/vocabulary-challenge.builder";
export type { ReviewSourceItem } from "./builders/vocabulary-challenge.builder";
export {
  mapSavedWord,
  mapVocabularyExample,
  mapVocabularyItem,
  mapVocabularyProgress,
} from "./mappers/vocabulary-item.mapper";
export type {
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "./types/vocabulary.types";
