"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/src/components/localized-link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { recordVocabularyReviewResult } from "@/src/services/vocabulary/vocabulary-progress.service";
import { recordPracticeSessionResult } from "@/src/services/practice/practice-sessions.service";
import { Button } from "@/src/components/ui/button";
import { VocabularyCard } from "@/src/components/vocabulary/vocabulary-card";
import { withLocale } from "@/src/lib/i18n/paths";
import type { DictationPracticeChallenge } from "@/src/modules/practice/dictation-session";
import type { PracticeCefrLevel } from "@/src/modules/practice/fill-blank-session";

import { PracticeResult, type PracticeResultItem } from "../practice-result";
import { PracticeSessionShell } from "../practice-session-shell";

type DictationPracticeQuizProps = {
  initialChallenges: DictationPracticeChallenge[];
  practiceLevel?: PracticeCefrLevel;
  lessonNumber: number;
  totalLessons?: number;
};

const normalizeAnswer = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ");
};

export const DictationPracticeQuiz = ({
  initialChallenges,
  practiceLevel,
  lessonNumber,
  totalLessons,
}: DictationPracticeQuizProps) => {
  const t = useTranslations("practice");
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { width, height } = useWindowSize();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [reviewedItems, setReviewedItems] = useState<PracticeResultItem[]>([]);
  const [pending, startTransition] = useTransition();

  const challenge = initialChallenges[activeIndex];
  const percentage = (activeIndex / initialChallenges.length) * 100;
  const mapHref = practiceLevel
    ? `/practice?mode=dictation&level=${practiceLevel}`
    : "/practice?mode=dictation&level=mix";
  const nextLessonHref =
    practiceLevel && totalLessons && lessonNumber < totalLessons
      ? `/practice/dictation?level=${practiceLevel}&lesson=${
          lessonNumber + 1
        }`
      : undefined;

  useEffect(() => {
    if (status === "none") inputRef.current?.focus();
  }, [activeIndex, status]);

  const onPlayPromptAudio = () => {
    if (!challenge?.vocabularyItem.audioUrl) return;

    const audio = new Audio(challenge.vocabularyItem.audioUrl);
    void audio.play().catch(() => toast.error(t("playAudioError")));
  };

  const onPracticeAgain = () => {
    sessionSavedRef.current = false;
    setActiveIndex(0);
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
    recordPracticeSessionResult({
      mode: "dictation",
      items: reviewedItems.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(t("saveProgressError")));
  }, [challenge, reviewedItems, t]);

  const addReviewedItem = (correct: boolean, userAnswer: string) => {
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
      recordVocabularyReviewResult(challenge.vocabularyItem.id, correct).catch(
        () => toast.error(t("saveProgressError"))
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
          alt={t("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("noDictationAudio")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("dictationEmptyDescription", {
            level: practiceLevel ? t("atLevel", { level: practiceLevel }) : "",
          })}
        </p>
        <Button asChild variant="primary" size="lg">
          <Link href={withLocale(mapHref)}>{t("backToPractice")}</Link>
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
          title={t("dictationCompleteTitle")}
          correctCount={correctCount}
          wrongCount={wrongCount}
          mapHref={mapHref}
          nextLessonHref={nextLessonHref}
          reviewedItems={reviewedItems}
          onRetry={onPracticeAgain}
        />
      </>
    );
  }

  const checked = status !== "none";

  return (
    <>
      {incorrectAudio}
      {correctAudio}

      <PracticeSessionShell
        exitLabel={t("exit")}
        onExit={() => router.push(mapHref)}
        percentage={percentage}
        current={activeIndex + 1}
        total={initialChallenges.length}
        footer={
          <footer className="min-h-[88px] shrink-0 border-t bg-background lg:min-h-[104px]">
            <div className="mx-auto flex min-h-[88px] max-w-[1140px] items-center justify-end px-4 py-4 sm:px-6 lg:min-h-[104px] lg:px-10">
              <Button
                disabled={pending || (!checked && !answer.trim())}
                onClick={onContinue}
                size="lg"
                variant={status === "wrong" ? "danger" : "primary"}
              >
                {checked ? t("continue") : t("check")}
              </Button>
            </div>
          </footer>
        }
      >
            <h1 className="text-balance text-center text-xl font-bold leading-tight text-foreground lg:text-left lg:text-3xl">
              {t("listenAndType")}
              {practiceLevel ? ` - ${practiceLevel}` : ""}
            </h1>

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

              <form onSubmit={onSubmit} className="mt-6">
                <input
                  ref={inputRef}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={checked || pending}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-center text-lg font-bold text-neutral-800 outline-none transition placeholder:text-slate-300 focus:border-green-500 disabled:bg-slate-50"
                  placeholder={t("typeWhatYouHear")}
                />
              </form>

              {checked && (
                <div className="mt-5 text-left">
                  <VocabularyCard
                    item={challenge.vocabularyItem}
                    showMeaning
                  />
                </div>
              )}
            </div>
      </PracticeSessionShell>
    </>
  );
};
