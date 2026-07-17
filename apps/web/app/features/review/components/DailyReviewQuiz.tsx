"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { vocabularyApi } from "@/app/features/vocabulary/api/vocabulary.api";
import { practiceApi } from "@/app/features/practice/api/practice.api";
import { Button } from "@/app/components/ui/button";
import { VocabularyCard } from "@/app/features/vocabulary/components/VocabularyCard";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { useLocalizedChallengeQuestion } from "@/app/i18n/use-localized-challenge-question";
import type { DailyReviewChallenge } from "@repo/shared";

import { Challenge } from "@/app/features/lessons/components/LessonChallenge";
import { Footer } from "@/app/features/lessons/components/LessonFooter";
import { QuestionBubble } from "@/app/features/lessons/components/QuestionBubble";
import {
  PracticeResult,
  type PracticeResultItem,
} from "@/app/features/practice/components/PracticeResult";

type DailyReviewQuizProps = {
  initialChallenges: DailyReviewChallenge[];
};

const normalizeAnswer = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"]/g, "")
    .replace(/[\u2019`]/g, "'")
    .replace(/\s+/g, " ");
};

export const DailyReviewQuiz = ({
  initialChallenges,
}: DailyReviewQuizProps) => {
  const t = useTranslations("review");
  const practiceT = useTranslations("practice");
  const lessonT = useTranslations("lesson");
  const localizeChallengeQuestion = useLocalizedChallengeQuestion();
  const locale = useCurrentLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionSavedRef = useRef(false);
  const { width, height } = useWindowSize();
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number>();
  const [answer, setAnswer] = useState("");
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
  const isDictationChallenge = challenge?.type === "AUDIO_TO_TEXT";
  const isListeningChallenge = challenge?.type === "LISTEN_SELECT";
  const isFillBlankChallenge = challenge?.type === "FILL_BLANK";
  const shouldHideVocabularyPrompt =
    challenge?.type === "ASSIST" && status === "none";

  const onSelect = (id: number) => {
    if (status !== "none") return;
    setSelectedOption(id);
  };

  useEffect(() => {
    if (isDictationChallenge && status === "none") inputRef.current?.focus();
  }, [activeIndex, isDictationChallenge, status]);

  const onPlayPromptAudio = () => {
    if (!challenge?.vocabularyItem.audioUrl) return;

    const audio = new Audio(challenge.vocabularyItem.audioUrl);
    void audio.play().catch(() => toast.error(practiceT("playAudioError")));
  };

  const onReviewAgain = () => {
    sessionSavedRef.current = false;
    setActiveIndex(0);
    setSelectedOption(undefined);
    setAnswer("");
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
    practiceApi.recordSession({
      mode: "daily_review",
      items: reviewedItems.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(practiceT("saveReviewError")));
  }, [challenge, practiceT, reviewedItems]);

  const addReviewedItem = (correct: boolean, userAnswer?: string) => {
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
        answer: userAnswer,
      },
    ]);
  };

  const onContinue = () => {
    if (!challenge) return;

    if (isDictationChallenge) {
      if (status !== "none") {
        setActiveIndex((current) => current + 1);
        setAnswer("");
        setStatus("none");
        return;
      }

      const normalizedAnswer = normalizeAnswer(answer);
      if (!normalizedAnswer) return;

      const correct =
        normalizedAnswer === normalizeAnswer(challenge.vocabularyItem.word);

      if (correct) {
        void correctControls.play();
        setCorrectCount((current) => current + 1);
        setStatus("correct");
      } else {
        void incorrectControls.play();
        setWrongCount((current) => current + 1);
        setStatus("wrong");
      }

      addReviewedItem(correct, answer);

      startTransition(() => {
        vocabularyApi.recordReview(
          challenge.vocabularyItem.id,
          correct
        ).catch(() => toast.error(practiceT("saveReviewError")));
      });

      return;
    }

    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (status === "correct") {
      setActiveIndex((current) => current + 1);
      setStatus("none");
      setSelectedOption(undefined);
      setAnswer("");
      return;
    }

    if (!selectedOption) return;

    const correctOption = options.find((option) => option.correct);
    if (!correctOption) return;

    const correct = correctOption.id === selectedOption;

    if (correct) {
      void correctControls.play();
      setCorrectCount((current) => current + 1);
      setStatus("correct");
    } else {
      void incorrectControls.play();
      setWrongCount((current) => current + 1);
      setStatus("wrong");
    }

    addReviewedItem(correct, options.find((option) => option.id === selectedOption)?.text);

    startTransition(() => {
      vocabularyApi.recordReview(challenge.vocabularyItem.id, correct).catch(
        () => toast.error(practiceT("saveReviewError"))
      );
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    onContinue();
  };

  if (initialChallenges.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center">
        <Image
          src="/mascot.svg"
          alt={practiceT("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("emptyTitle")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button asChild variant="primary" size="lg">
            <Link href={withLocale("/learn")}>{t("goLearn")}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={withLocale("/dashboard")}>{t("backToDashboard")}</Link>
          </Button>
        </div>
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
          title={t("completeTitle")}
          correctCount={correctCount}
          wrongCount={wrongCount}
          mapHref={withLocale("/dashboard")}
          reviewedItems={reviewedItems}
          onRetry={onReviewAgain}
        />
      </>
    );
  }

  const localizedQuestion = localizeChallengeQuestion(challenge);
  const title =
    challenge.type === "AUDIO_TO_TEXT"
      ? practiceT("listenAndType")
      : challenge.type === "LISTEN_SELECT"
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
          onClick={() => router.push(withLocale("/dashboard", locale))}
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
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-green-500">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-lg font-bold text-neutral-700 lg:text-3xl">
                {title}
              </h1>
            </div>

            {isDictationChallenge ? (
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

                <form onSubmit={onSubmit} className="mt-6">
                  <input
                    ref={inputRef}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    disabled={status !== "none" || pending}
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-center text-lg font-bold text-neutral-800 outline-none transition placeholder:text-slate-300 focus:border-green-500 disabled:bg-slate-50"
                    placeholder={practiceT("typeWhatYouHear")}
                  />
                </form>

                {status !== "none" && (
                  <div className="mt-5 text-left">
                    <VocabularyCard
                      item={challenge.vocabularyItem}
                      showMeaning
                    />
                  </div>
                )}
              </div>
            ) : isListeningChallenge ? (
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

            {!isDictationChallenge && (
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
                type={
                  challenge.type === "AUDIO_TO_TEXT" ? "SELECT" : challenge.type
                }
              />
            </div>
            )}
          </div>
        </div>
      </div>

      {isDictationChallenge ? (
        <footer className="h-[100px] border-t-2 lg:h-[140px]">
          <div className="mx-auto flex h-full max-w-[1140px] items-center justify-end px-6 lg:px-10">
            <Button
              disabled={pending || (status === "none" && !answer.trim())}
              onClick={onContinue}
              size="lg"
              variant={status === "wrong" ? "danger" : "primary"}
            >
              {status === "none" ? practiceT("check") : practiceT("continue")}
            </Button>
          </div>
        </footer>
      ) : (
      <Footer
        disabled={pending || !selectedOption}
        status={status}
        onCheck={onContinue}
      />
      )}
    </>
  );
};
