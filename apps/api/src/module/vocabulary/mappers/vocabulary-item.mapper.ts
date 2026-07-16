import type {
  user_saved_words as user_saved_wordsModel,
  user_vocabulary_progress as user_vocabulary_progressModel,
  vocabulary_examples as vocabulary_examplesModel,
  vocabulary_items as vocabulary_itemsModel,
} from "@prisma/client";
import type {
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "../types/vocabulary.types";

export type VocabularyItemRecord = vocabulary_itemsModel & {
  user_saved_words?: user_saved_wordsModel[];
  user_vocabulary_progress?: user_vocabulary_progressModel[];
  vocabulary_examples?: vocabulary_examplesModel[];
};

export function mapSavedWord(savedWord: user_saved_wordsModel): UserSavedWord {
  return {
    id: savedWord.id,
    userId: savedWord.user_id,
    vocabularyItemId: savedWord.vocabulary_item_id,
    createdAt: savedWord.created_at,
  };
}

export function mapVocabularyProgress(
  progress: user_vocabulary_progressModel
): UserVocabularyProgress {
  return {
    id: progress.id,
    userId: progress.user_id,
    vocabularyItemId: progress.vocabulary_item_id,
    correctCount: progress.correct_count,
    wrongCount: progress.wrong_count,
    reviewCount: progress.review_count,
    masteryLevel: progress.mastery_level,
    easeFactor: progress.ease_factor,
    intervalDays: progress.interval_days,
    repetitionCount: progress.repetition_count,
    lastReviewedAt: progress.last_reviewed_at,
    nextReviewAt: progress.next_review_at,
    createdAt: progress.created_at,
    updatedAt: progress.updated_at,
  };
}

export function mapVocabularyExample(
  example: vocabulary_examplesModel
): VocabularyExample {
  return {
    id: example.id,
    vocabularyItemId: example.vocabulary_item_id,
    exampleEn: example.example_en,
    exampleVi: example.example_vi,
    source: example.source,
    order: example.order,
    createdAt: example.created_at,
  };
}

export function mapVocabularyItem(item: VocabularyItemRecord): VocabularyItem {
  return {
    id: item.id,
    word: item.word,
    normalizedWord: item.normalized_word,
    pos: item.pos,
    posVi: item.pos_vi,
    cefrLevel: item.cefr_level,
    phonetic: item.phonetic,
    phoneticSource: item.phonetic_source,
    audioUrl: item.audio_url,
    audioSource: item.audio_source,
    exampleEn: item.example_en,
    exampleVi: item.example_vi,
    exampleSource: item.example_source,
    meaningVi: item.meaning_vi,
    primaryMeaningVi: item.primary_meaning_vi,
    source: item.source,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    userSavedWords: item.user_saved_words?.map(mapSavedWord) ?? [],
    userVocabularyProgress:
      item.user_vocabulary_progress?.map(mapVocabularyProgress) ?? [],
    vocabularyExamples:
      item.vocabulary_examples?.map(mapVocabularyExample) ?? [],
  };
}
