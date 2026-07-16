export { VocabularyModule } from "./vocabulary.module";
export { GetSavedVocabularyWordsUseCase } from "./use-cases/get-saved-vocabulary-words.use-case";
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
