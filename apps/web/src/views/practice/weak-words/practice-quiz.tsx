"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { recordVocabularyReviewResult } from "@/src/services/vocabulary/vocabulary-progress.service";
import { recordPracticeSessionResult } from "@/src/services/practice/practice-sessions.service";
import { Button } from "@/app/components/ui/button";
import { VocabularyCard } from "@/src/components/vocabulary/vocabulary-card";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { useLocalizedChallengeQuestion } from "@/app/i18n/use-localized-challenge-question";
import type { WeakWordsPracticeChallenge } from "@/src/modules/practice/weak-words-session";

import { Challenge } from "@/src/views/lesson/challenge";
import { Footer } from "@/src/views/lesson/footer";
import { QuestionBubble } from "@/src/views/lesson/question-bubble";
import { PracticeResult, type PracticeResultItem } from "../practice-result";
import { PracticeSessionShell } from "../practice-session-shell";

type WeakWordsPracticeQuizProps = {
  initialChallenges: WeakWordsPracticeChallenge[];
};

export const WeakWordsPracticeQuiz = ({
  initialChallenges,
}: WeakWordsPracticeQuizProps) => {
  const t = useTranslations("practice");
  const locale = useCurrentLocale();
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
    void audio.play().catch(() => toast.error(t("playAudioError")));
  };

  const onPracticeAgain = () => {
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
      mode: "weak_words",
      items: reviewedItems.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(t("saveReviewError")));
  }, [challenge, reviewedItems, t]);

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
        recordVocabularyReviewResult(challenge.vocabularyItem.id, true).catch(
          () => toast.error(t("saveReviewError"))
        );
      });
    } else {
      void incorrectControls.play();
      setWrongCount((current) => current + 1);
      setStatus("wrong");
      addReviewedItem(false, options.find((option) => option.id === selectedOption)?.text);

      startTransition(() => {
        recordVocabularyReviewResult(challenge.vocabularyItem.id, false).catch(
          () => toast.error(t("saveReviewError"))
        );
      });
    }
  };

  if (initialChallenges.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center">
        <Image
          src="/mascot.svg"
          alt={t("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("noWeakWords")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("weakWordsEmptyDescription")}
        </p>
        <Button asChild variant="primary" size="lg">
          <Link href={withLocale("/practice")}>{t("backToPractice")}</Link>
        </Button>
      </div>
    );
  }

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
          title={t("weakWordsCompleteTitle")}
          correctCount={correctCount}
          wrongCount={wrongCount}
          mapHref={withLocale("/practice")}
          reviewedItems={reviewedItems}
          onRetry={onPracticeAgain}
        />
      </>
    );
  }

  const localizedQuestion = localizeChallengeQuestion(challenge);
  const title =
    challenge.type === "LISTEN_SELECT"
      ? t("listenAndChoose")
      : challenge.type === "FILL_BLANK"
        ? t("completeSentence")
        : challenge.type === "ASSIST"
          ? lessonT("selectCorrectWord")
          : localizedQuestion;

  return (
    <>
      {incorrectAudio}
      {correctAudio}

      <PracticeSessionShell
        exitLabel={t("exit")}
        onExit={() => router.push(withLocale("/practice", locale))}
        percentage={percentage}
        current={activeIndex + 1}
        total={initialChallenges.length}
        footer={
          <Footer
            disabled={pending || !selectedOption}
            status={status}
            onCheck={onContinue}
          />
        }
      >
            <h1 className="text-balance text-center text-xl font-bold leading-tight text-foreground lg:text-left lg:text-3xl">
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
                  aria-label={t("playPronunciation")}
                  title={t("playPronunciation")}
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
      </PracticeSessionShell>
    </>
  );
};
