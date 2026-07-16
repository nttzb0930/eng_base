import type {
  practice_session_itemsModel,
  practice_sessionsModel,
  vocabulary_itemsModel,
} from "../../generated/prisma/models";

type PracticeSessionItemRecord = practice_session_itemsModel & {
  vocabulary_items?: vocabulary_itemsModel | null;
};

export type PracticeSessionDetailRecord = practice_sessionsModel & {
  items?: PracticeSessionItemRecord[];
};

export function mapPracticeSession(session: practice_sessionsModel) {
  return {
    id: session.id,
    userId: session.user_id,
    mode: session.mode,
    correctCount: session.correct_count,
    wrongCount: session.wrong_count,
    accuracy: session.accuracy,
    createdAt: session.created_at,
  };
}

export function mapPracticeSessionDetail(
  session: PracticeSessionDetailRecord,
) {
  return {
    ...mapPracticeSession(session),
    items:
      session.items?.map((item) => ({
        id: item.id,
        vocabularyItemId: item.vocabulary_item_id,
        challengeType: item.challenge_type,
        correct: item.correct,
        answer: item.answer,
        createdAt: item.created_at,
        vocabularyItem: item.vocabulary_items
          ? {
              id: item.vocabulary_items.id,
              word: item.vocabulary_items.word,
              meaningVi: item.vocabulary_items.meaning_vi,
              primaryMeaningVi: item.vocabulary_items.primary_meaning_vi,
              cefrLevel: item.vocabulary_items.cefr_level,
            }
          : null,
      })) ?? [],
  };
}
