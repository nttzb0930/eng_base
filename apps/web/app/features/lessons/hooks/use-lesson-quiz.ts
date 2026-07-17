"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import { practiceApi } from "@/app/features/practice/api/practice.api";
import { vocabularyApi } from "@/app/features/vocabulary/api/vocabulary.api";
import { MAX_HEARTS } from "@repo/shared";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { progressApi } from "@/app/features/progress/api/progress.api";
import type {
  Challenge as LessonChallenge,
  UserSavedWord,
  VocabularyItem,
} from "@repo/shared";
import type { PracticeResultItem } from "@/app/features/practice/components/PracticeResult";
import { useHeartsModal } from "@/app/features/progress/store/hearts-modal.store";
import { usePracticeModal } from "@/app/features/practice/store/practice-modal.store";

export type QuizChallenge = LessonChallenge & {
  completed: boolean;
  vocabularyItem:
  | (VocabularyItem & {
    userSavedWords: UserSavedWord[];
  })
  | null;
};

type UseLessonQuizParams = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialLessonChallenges: QuizChallenge[];
};

export function useLessonQuiz({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialLessonChallenges,
}: UseLessonQuizParams) {
  const t = useTranslations("lesson");
  const locale = useCurrentLocale();
  const vocabularyT = useTranslations("vocabulary");
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({ src: "/incorrect.wav" });
  const [finishAudio] = useAudio({ src: "/finish.mp3", autoPlay: true });

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
    if (initialHearts === 0) openHeartsModal(initialLessonId);
  });

  const [lessonId] = useState(initialLessonId);
  const [startedAt] = useState(() => Date.now());
  const [durationSeconds, setDurationSeconds] = useState(1);
  const [hearts, setHearts] = useState(initialHearts);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [percentage, setPercentage] = useState(() =>
    initialPercentage === 100 ? 0 : initialPercentage
  );
  const [challenges] = useState(initialLessonChallenges);
  const [challengeQueue, setChallengeQueue] = useState(() =>
    initialPercentage === 100
      ? initialLessonChallenges
      : initialLessonChallenges.filter((challenge) => !challenge.completed)
  );

  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  const [reviewedItems, setReviewedItems] = useState<PracticeResultItem[]>([]);
  const [savedVocabularyIds, setSavedVocabularyIds] = useState(
    () =>
      new Set(
        initialLessonChallenges
          .filter(
            (c) => c.vocabularyItem && c.vocabularyItem.userSavedWords.length > 0
          )
          .map((c) => c.vocabularyItem!.id)
      )
  );

  const challenge = challengeQueue[0];
  const options = challenge?.challengeOptions ?? [];
  const vocabularyItem = challenge?.vocabularyItem;
  const isSaved = !!vocabularyItem && savedVocabularyIds.has(vocabularyItem.id);
  const shouldHideVocabularyPrompt = challenge?.type === "ASSIST" && status === "none";

  const onSelect = (id: number) => {
    if (status !== "none") return;
    setSelectedOption(id);
  };

  const onToggleSavedWord = () => {
    if (!vocabularyItem) return;
    startTransition(() => {
      vocabularyApi.toggleSaved(vocabularyItem.id)
        .then((response) => {
          setSavedVocabularyIds((current) => {
            const next = new Set(current);
            if (response.saved) {
              next.add(vocabularyItem.id);
            } else {
              next.delete(vocabularyItem.id);
            }
            return next;
          });
        })
        .catch(() => toast.error(t("saveError")));
    });
  };

  const saveCompletedSession = (items: PracticeResultItem[]) => {
    practiceApi.recordSession({
      mode: "lesson",
      items: items.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(t("genericError")));
  };

  const createReviewedItem = (
    correct: boolean,
    answer?: string
  ): PracticeResultItem | null => {
    if (!challenge?.vocabularyItem) return null;

    return {
      vocabularyItemId: challenge.vocabularyItem.id,
      word: challenge.vocabularyItem.word,
      meaning: challenge.vocabularyItem.primaryMeaningVi,
      cefrLevel: challenge.vocabularyItem.cefrLevel,
      correct,
      challengeType: challenge.type,
      answer,
    };
  };

  const onContinue = () => {
    if (!selectedOption) return;

    if (status === "wrong") {
      setChallengeQueue(([current, ...remaining]) =>
        current ? [...remaining, current] : remaining
      );
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (status === "correct") {
      setChallengeQueue((current) => current.slice(1));
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    const correctOption = options.find((option) => option.correct);
    if (!correctOption) return;

    if (correctOption.id === selectedOption) {
      startTransition(() => {
        progressApi.completeChallenge(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              setHearts(0);
              openHeartsModal(initialLessonId);
              return;
            }
            void correctControls.play();
            setStatus("correct");
            setCorrectCount((current) => current + 1);
            setEarnedXp((current) => current + 10);
            setPercentage((prev) => prev + 100 / challenges.length);
            const reviewedItem = createReviewedItem(true, correctOption.text);
            const nextReviewedItems = reviewedItem
              ? [...reviewedItems, reviewedItem]
              : reviewedItems;
            if (reviewedItem) {
              setReviewedItems(nextReviewedItems);
              void vocabularyApi.recordReview(
                reviewedItem.vocabularyItemId,
                true
              ).catch(() => toast.error(t("genericError")));
            }
            if (challengeQueue.length === 1) {
              setDurationSeconds(
                Math.max(1, Math.round((Date.now() - startedAt) / 1000))
              );
              if (nextReviewedItems.length > 0) {
                saveCompletedSession(nextReviewedItems);
              }
            }
            if (initialPercentage === 100) {
              setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
            }
          })
          .catch(() => toast.error(t("genericError")));
      });
    } else {
      startTransition(() => {
        progressApi.reduceHearts(challenge.id)
          .then((response) => {
            setWrongCount((current) => current + 1);
            const reviewedItem = createReviewedItem(
              false,
              options.find((option) => option.id === selectedOption)?.text
            );
            if (reviewedItem) {
              setReviewedItems((current) => [...current, reviewedItem]);
              void vocabularyApi.recordReview(
                reviewedItem.vocabularyItemId,
                false
              ).catch(() => toast.error(t("genericError")));
            }

            if (response?.error === "hearts") {
              setHearts(0);
              openHeartsModal(initialLessonId);
              return;
            }
            void incorrectControls.play();
            setStatus("wrong");
            if (!response?.error) setHearts((prev) => Math.max(prev - 1, 0));
          })
          .catch(() => toast.error(t("genericError")));
      });
    }
  };

  return {
    t,
    locale,
    vocabularyT,
    router,
    width,
    height,
    pending,
    lessonId,
    hearts,
    correctCount,
    wrongCount,
    earnedXp,
    durationSeconds,
    percentage,
    challenges,
    challenge,
    options,
    vocabularyItem,
    isSaved,
    shouldHideVocabularyPrompt,
    selectedOption,
    status,
    correctAudio,
    incorrectAudio,
    finishAudio,
    reviewedItems,
    onSelect,
    onContinue,
    onToggleSavedWord,
  };
}
