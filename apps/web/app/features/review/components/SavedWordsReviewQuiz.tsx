"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";
import { Volume2 } from "lucide-react";

import { vocabularyApi } from "@/app/features/vocabulary/api/vocabulary.api";
import { recordPracticeSessionResult } from "@/src/services/practice/practice-sessions.service";
import { Button } from "@/app/components/ui/button";
import { VocabularyCard } from "@/app/features/vocabulary/components/VocabularyCard";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { useLocalizedChallengeQuestion } from "@/app/i18n/use-localized-challenge-question";
import type { SavedWordReviewChallenge } from "@repo/shared/review";

import { Challenge } from "@/app/features/lessons/components/LessonChallenge";
import { Footer } from "@/app/features/lessons/components/LessonFooter";
import { QuestionBubble } from "@/app/features/lessons/components/QuestionBubble";
import {
  PracticeResult,
  type PracticeResultItem,
} from "@/src/views/practice/practice-result";

type SavedWordsReviewQuizProps = {
  initialChallenges: SavedWordReviewChallenge[];
  reviewMode: "all" | "due";
};

export const SavedWordsReviewQuiz = ({
  initialChallenges,
  reviewMode,
}: SavedWordsReviewQuizProps) => {
  const t = useTranslations("savedWords");
  const locale = useCurrentLocale();
  const practiceT = useTranslations("practice");
  const lessonT = useTranslations("lesson");
  const localizeChallengeQuestion = useLocalizedChallengeQuestion();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _correctAudioElement, correctControls] = useAudio({
    src: "/correct.wav",
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _incorrectAudioElement, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });

  const router = useRouter();
  const sessionSavedRef = useRef(false);
  const { width, height } = useWindowSize();

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [reviewedItems, setReviewedItems] = useState<PracticeResultItem[]>([]);
  const [pending, startTransition] = useTransition();

  const percentage = useMemo(() => {
    return (activeIndex / initialChallenges.length) * 100;
  }, [activeIndex, initialChallenges.length]);

  const challenge = initialChallenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const isListeningChallenge = challenge?.type === "LISTEN_SELECT";
  const isFillBlankChallenge = challenge?.type === "FILL_BLANK";
  const shouldHideVocabularyPrompt =
    challenge?.type === "ASSIST" && status === "none";

  const onSelect = (id: number) => {
    if (status !== "none") return;
    setSelectedOption(id);
  };

  const onPlayPromptAudio = () => {
    if (!challenge?.vocabularyItem.audioUrl) return;

    const audio = new Audio(challenge.vocabularyItem.audioUrl);
    void audio.play().catch(() => toast.error(practiceT("playAudioError")));
  };

  const onReviewAgain = () => {
    sessionSavedRef.current = false;
    setActiveIndex(0);
    setSelectedOption(undefined);
    setStatus("none");
    setCorrectCount(0);
    setWrongCount(0);
    setReviewedItems([]);
    router.refresh();
  };

  useEffect(() => {
    if (challenge || reviewedItems.length === 0 || sessionSavedRef.current) {
      return;
    }

    sessionSavedRef.current = true;
    recordPracticeSessionResult({
      mode: "saved_words",
      items: reviewedItems.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(practiceT("saveReviewError")));
  }, [challenge, practiceT, reviewedItems]);

  const addReviewedItem = (correct: boolean, answer?: string) => {
    if (!challenge) return;

    setReviewedItems((current) => [
      ...current,
      {
        vocabularyItemId: challenge.vocabularyItem.id,
        word: challenge.vocabularyItem.word,
        meaning: challenge.vocabularyItem.primaryMeaningVi,
        cefrLevel: challenge.vocabularyItem.cefrLevel,
        correct,
        challengeType: challenge.type,
        answer,
      },
    ]);
  };

  const onContinue = () => {
    if (!challenge) return;

    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (status === "correct") {
      setActiveIndex((current) => current + 1);
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (!selectedOption) return;

    const correctOption = options.find((option) => option.correct);
    if (!correctOption) return;

    if (correctOption.id === selectedOption) {
      void correctControls.play();
      setCorrectCount((current) => current + 1);
      setStatus("correct");
      addReviewedItem(true, correctOption.text);

      startTransition(() => {
        vocabularyApi.recordReview(challenge.vocabularyItem.id, true).catch(
          () => toast.error(practiceT("saveReviewError"))
        );
      });
    } else {
      void incorrectControls.play();
      setWrongCount((current) => current + 1);
      setStatus("wrong");
      addReviewedItem(false, options.find((option) => option.id === selectedOption)?.text);

      startTransition(() => {
        vocabularyApi.recordReview(challenge.vocabularyItem.id, false).catch(
          () => toast.error(practiceT("saveReviewError"))
        );
      });
    }
  };

  if (!challenge) {
    return (
      <>
        {finishAudio}
        <Confetti
          recycle={false}
          numberOfPieces={180}
          gravity={0.14}
          tweenDuration={7_000}
          width={width}
          height={height}
          className="pointer-events-none motion-reduce:hidden"
          aria-hidden="true"
        />

        <PracticeResult
          title={
            reviewMode === "due" ? t("dueReviewComplete") : t("reviewComplete")
          }
          correctCount={correctCount}
          wrongCount={wrongCount}
          mapHref={withLocale("/saved-words")}
          retryLabel={practiceT("practiceAgain")}
          reviewedItems={reviewedItems}
          onRetry={onReviewAgain}
        />
      </>
    );
  }

  const localizedQuestion = localizeChallengeQuestion(challenge);
  const title =
    challenge.type === "LISTEN_SELECT"
      ? practiceT("listenAndChoose")
      : challenge.type === "FILL_BLANK"
        ? practiceT("completeSentence")
        : challenge.type === "ASSIST"
          ? lessonT("selectCorrectWord")
          : localizedQuestion;

  return (
    <>
      {incorrectAudio}
      {correctAudio}

      <header className="flex items-center justify-between border-b-2 px-6 py-4 lg:px-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(withLocale("/saved-words", locale))}
        >
          {practiceT("exit")}
        </Button>
        <div className="h-4 flex-1 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="ml-4 text-sm font-bold text-neutral-500">
          {activeIndex + 1}/{initialChallenges.length}
        </p>
      </header>

      <div className="flex-1">
        <div className="flex h-full items-center justify-center">
          <div className="flex w-full flex-col gap-y-10 px-6 lg:min-h-[350px] lg:w-[600px] lg:px-0">
            <h1 className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl">
              {title}
            </h1>

            {isListeningChallenge ? (
              <div className="rounded-lg border-2 border-slate-200 bg-white p-6 text-center shadow-sm">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={onPlayPromptAudio}
                  className="h-20 w-20 rounded-full p-0"
                  aria-label={practiceT("playPronunciation")}
                  title={practiceT("playPronunciation")}
                >
                  <Volume2 className="h-8 w-8" />
                </Button>

                {status !== "none" && (
                  <div className="mt-5 text-left">
                    <VocabularyCard
                      item={challenge.vocabularyItem}
                      showMeaning
                    />
                  </div>
                )}
              </div>
            ) : isFillBlankChallenge ? (
              <div className="rounded-lg border-2 border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-bold leading-8 text-neutral-700">
                  {localizedQuestion}
                </p>

                {status !== "none" && (
                  <div className="mt-5">
                    <VocabularyCard
                      item={challenge.vocabularyItem}
                      showMeaning
                    />
                  </div>
                )}
              </div>
            ) : shouldHideVocabularyPrompt ? null : (
              <VocabularyCard
                item={challenge.vocabularyItem}
                showMeaning={status !== "none"}
              />
            )}

            <div>
              {challenge.type === "ASSIST" && (
                <QuestionBubble question={localizedQuestion} />
              )}

              <Challenge
                options={options}
                onSelect={onSelect}
                status={status}
                selectedOption={selectedOption}
                disabled={pending}
                type={challenge.type}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={pending || !selectedOption}
        status={status}
        onCheck={onContinue}
      />
    </>
  );
};
