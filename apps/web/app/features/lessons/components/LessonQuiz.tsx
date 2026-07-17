"use client";

import { VocabularyCard } from "@/app/features/vocabulary/components/VocabularyCard";

import { useLocalizedChallengeQuestion } from "@/app/i18n/use-localized-challenge-question";

import { useLessonQuiz, type QuizChallenge } from "../hooks/use-lesson-quiz";
import { Challenge } from "./LessonChallenge";
import { LessonComplete } from "./LessonComplete";
import { Footer } from "./LessonFooter";
import { Header } from "./LessonHeader";
import { QuestionBubble } from "./QuestionBubble";

type LessonQuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialLessonTitle: string;
  initialLessonChallenges: QuizChallenge[];
  nextLesson: { id: number; title: string } | null;
};

export function LessonQuiz(props: LessonQuizProps) {
  const localizeChallengeQuestion = useLocalizedChallengeQuestion();
  const {
    t,
    vocabularyT,
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
  } = useLessonQuiz(props);

  if (!challenge) {
    return (
      <>
        {finishAudio}
        <LessonComplete
          lessonId={lessonId}
          lessonTitle={props.initialLessonTitle}
          nextLesson={props.nextLesson}
          hearts={hearts}
          correctCount={correctCount}
          wrongCount={wrongCount}
          earnedXp={earnedXp}
          durationSeconds={durationSeconds}
          reviewedItems={reviewedItems}
          width={width}
          height={height}
        />
      </>
    );
  }

  const localizedQuestion = localizeChallengeQuestion(challenge);
  const title =
    challenge.type === "ASSIST" ? t("selectCorrectWord") : localizedQuestion;

  return (
    <>
      {incorrectAudio}
      {correctAudio}
      <Header hearts={hearts} percentage={percentage} />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full items-start justify-center py-6 lg:items-center lg:py-8">
          <div className="flex w-full max-w-[680px] flex-col gap-y-6 px-4 sm:px-6 lg:gap-y-8 lg:px-0">
            <h1 className="text-balance text-center text-xl font-bold leading-tight text-foreground lg:text-left lg:text-3xl">
              {title}
            </h1>

            {vocabularyItem && !shouldHideVocabularyPrompt && (
              <VocabularyCard
                item={vocabularyItem}
                showMeaning={status !== "none"}
                action={{
                  label: vocabularyT("save"),
                  activeLabel: vocabularyT("saved"),
                  active: isSaved,
                  disabled: pending,
                  onClick: onToggleSavedWord,
                }}
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
      </main>

      <Footer
        disabled={pending || !selectedOption}
        status={status}
        wrongAction="next"
        onCheck={onContinue}
      />
    </>
  );
}
