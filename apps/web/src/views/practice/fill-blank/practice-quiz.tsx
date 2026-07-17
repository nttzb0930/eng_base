"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { recordVocabularyReviewResult } from "@/src/services/vocabulary/vocabulary-progress.service";
import { recordPracticeSessionResult } from "@/src/services/practice/practice-sessions.service";
import { toggleSavedWord } from "@/src/services/vocabulary/saved-words.service";
import { Button } from "@/app/components/ui/button";
import { VocabularyCard } from "@/src/components/vocabulary/vocabulary-card";
import { withLocale } from "@/app/i18n/paths";
import type {
  FillBlankPracticeChallenge,
  PracticeCefrLevel,
} from "@/src/modules/practice/fill-blank-session";

import { Challenge } from "@/src/views/lesson/challenge";
import { Footer } from "@/src/views/lesson/footer";
import { PracticeResult, type PracticeResultItem } from "../practice-result";
import { PracticeSessionShell } from "../practice-session-shell";

type FillBlankPracticeQuizProps = {
  initialChallenges: FillBlankPracticeChallenge[];
  practiceLevel?: PracticeCefrLevel;
  lessonNumber: number;
  totalLessons?: number;
};

export const FillBlankPracticeQuiz = ({
  initialChallenges,
  practiceLevel,
  lessonNumber,
  totalLessons,
}: FillBlankPracticeQuizProps) => {
  const t = useTranslations("practice");
  const lessonT = useTranslations("lesson");
  const vocabularyT = useTranslations("vocabulary");
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
  const [savedVocabularyIds, setSavedVocabularyIds] = useState(
    () =>
      new Set(
        initialChallenges
          .filter(
            (challenge) => challenge.vocabularyItem.userSavedWords.length > 0
          )
          .map((challenge) => challenge.vocabularyItem.id)
      )
  );

  const challenge = initialChallenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const percentage = (activeIndex / initialChallenges.length) * 100;

  const onSelect = (id: number) => {
    if (status !== "none") return;
    setSelectedOption(id);
  };

  const onToggleSavedWord = () => {
    if (!challenge) return;

    const vocabularyItemId = challenge.vocabularyItem.id;

    startTransition(() => {
      toggleSavedWord(vocabularyItemId)
        .then((response) => {
          setSavedVocabularyIds((current) => {
            const next = new Set(current);

            if (response.saved) {
              next.add(vocabularyItemId);
            } else {
              next.delete(vocabularyItemId);
            }

            return next;
          });
        })
        .catch(() => toast.error(lessonT("saveError")));
    });
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
      mode: "fill_blank",
      items: reviewedItems.map((item) => ({
        vocabularyItemId: item.vocabularyItemId,
        challengeType: item.challengeType,
        correct: item.correct,
        answer: item.answer,
      })),
    }).catch(() => toast.error(t("saveProgressError")));
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

  const mapHref = practiceLevel
    ? `/practice?mode=fill-blank&level=${practiceLevel}`
    : "/practice?mode=fill-blank&level=mix";
  const nextLessonHref =
    practiceLevel && totalLessons && lessonNumber < totalLessons
      ? `/practice/fill-blank?level=${practiceLevel}&lesson=${
          lessonNumber + 1
        }`
      : undefined;

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
          () => toast.error(t("saveProgressError"))
        );
      });
    } else {
      void incorrectControls.play();
      setWrongCount((current) => current + 1);
      setStatus("wrong");
      addReviewedItem(false, options.find((option) => option.id === selectedOption)?.text);

      startTransition(() => {
        recordVocabularyReviewResult(challenge.vocabularyItem.id, false).catch(
          () => toast.error(t("saveProgressError"))
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
          {t("noFillBlankExamples")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("fillBlankEmptyDescription", {
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
          title={t("fillBlankCompleteTitle")}
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

  const isSaved = savedVocabularyIds.has(challenge.vocabularyItem.id);

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
          <Footer
            disabled={pending || !selectedOption}
            status={status}
            onCheck={onContinue}
          />
        }
      >
            <h1 className="text-balance text-center text-xl font-bold leading-tight text-foreground lg:text-left lg:text-3xl">
              {t("completeSentence")}
              {practiceLevel ? ` - ${practiceLevel}` : ""}
            </h1>

            <div className="rounded-lg border-2 border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-bold leading-8 text-neutral-700">
                {challenge.question}
              </p>

              {status !== "none" && (
                <div className="mt-5">
                  <VocabularyCard
                    item={challenge.vocabularyItem}
                    showMeaning
                    action={{
                      label: vocabularyT("save"),
                      activeLabel: vocabularyT("saved"),
                      active: isSaved,
                      disabled: pending,
                      onClick: onToggleSavedWord,
                    }}
                  />
                </div>
              )}
            </div>

            <Challenge
              options={options}
              onSelect={onSelect}
              status={status}
              selectedOption={selectedOption}
              disabled={pending}
              type={challenge.type}
            />
      </PracticeSessionShell>
    </>
  );
};
