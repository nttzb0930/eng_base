"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ToeicReadingPart,
  ToeicReadingPracticeAnswerResult,
  ToeicReadingPracticeSummary,
} from "@repo/shared";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { ToeicReadingFeedback } from "@/app/features/toeic-reading/components/ToeicReadingFeedback";
import { ToeicReadingPassagePane } from "@/app/features/toeic-reading/components/ToeicReadingPassagePane";
import { ToeicReadingPracticeShell } from "@/app/features/toeic-reading/components/ToeicReadingPracticeShell";
import { ToeicReadingPracticeSummary as PracticeSummary } from "@/app/features/toeic-reading/components/ToeicReadingPracticeSummary";
import {
  ToeicReadingQuestionDrawer,
  ToeicReadingQuestionSidebar,
} from "@/app/features/toeic-reading/components/ToeicReadingQuestionDrawer";
import { ToeicReadingQuestionPane } from "@/app/features/toeic-reading/components/ToeicReadingQuestionPane";
import { ToeicReadingSessionSkeleton } from "@/app/features/toeic-reading/components/ToeicReadingSessionSkeleton";
import { ToeicReadingWorkspace } from "@/app/features/toeic-reading/components/ToeicReadingWorkspace";
import {
  useCompleteToeicReadingPractice,
  useGradeToeicReadingPracticeAnswer,
  useStartToeicReadingPractice,
  useToeicReadingPractice,
  useToeicReadingTest,
  useUpdateToeicReadingPractice,
} from "@/app/features/toeic-reading/hooks/use-toeic-reading";
import {
  applyToeicReadingPracticeGrade,
  createToeicReadingPracticeUiState,
  failToeicReadingPracticeGrade,
  selectToeicReadingPracticeOption,
  type ToeicReadingPracticeUiState,
} from "@/app/features/toeic-reading/toeic-reading-practice-state";
import { toeicReadingDisplayTitle } from "@/app/features/toeic-reading/toeic-reading-display-title";

type ToeicReadingPracticeViewProps = {
  testId: number;
  part: ToeicReadingPart;
};

export function ToeicReadingPracticeView({
  testId,
  part,
}: ToeicReadingPracticeViewProps) {
  const t = useTranslations("toeicReading");
  const testQuery = useToeicReadingTest(testId, part);
  const startMutation = useStartToeicReadingPractice();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const practiceQuery = useToeicReadingPractice(sessionId);
  const gradeMutation = useGradeToeicReadingPracticeAnswer();
  const updateMutation = useUpdateToeicReadingPractice();
  const completeMutation = useCompleteToeicReadingPractice();
  const [uiState, setUiState] = useState<ToeicReadingPracticeUiState | null>(
    null
  );
  const [reviewQuestionIds, setReviewQuestionIds] = useState<number[]>([]);
  const [summary, setSummary] = useState<ToeicReadingPracticeSummary | null>(
    null
  );
  const startKeyRef = useRef<string | null>(null);
  const initializedSessionRef = useRef<number | null>(null);
  const requestKeysRef = useRef(new Map<number, string>());

  useEffect(() => {
    const test = testQuery.data;
    if (!test) return;
    const startKey = `${test.id}:${part}:${test.sourceVersion}`;
    if (startKeyRef.current === startKey) return;
    startKeyRef.current = startKey;
    void startMutation
      .mutateAsync({
        testId: test.id,
        part,
        sourceVersion: test.sourceVersion,
      })
      .then((session) => setSessionId(session.id))
      .catch(() => undefined);
  }, [part, startMutation, testQuery.data]);

  const session = practiceQuery.data;
  useEffect(() => {
    if (!session || initializedSessionRef.current === session.id) return;
    initializedSessionRef.current = session.id;
    setUiState(createToeicReadingPracticeUiState(session.activeQuestionId));
    setReviewQuestionIds(session.reviewQuestionIds);
  }, [session]);

  const questions = useMemo(
    () =>
      (session?.content.parts ?? [])
        .flatMap((item) => item.questions)
        .sort((left, right) => left.number - right.number),
    [session?.content.parts]
  );
  const answersByQuestion = useMemo(
    () =>
      new Map<number, ToeicReadingPracticeAnswerResult>(
        (session?.answers ?? []).map((answer) => [answer.questionId, answer])
      ),
    [session?.answers]
  );
  const activeQuestion = questions.find(
    (question) => question.id === uiState?.activeQuestionId
  );
  const activeIndex = activeQuestion
    ? questions.findIndex((question) => question.id === activeQuestion.id)
    : -1;

  useEffect(() => {
    if (!activeQuestion) return;
    requestAnimationFrame(() => {
      document
        .getElementById(`toeic-practice-question-${activeQuestion.id}`)
        ?.focus();
    });
  }, [activeQuestion]);

  if (summary) return <PracticeSummary summary={summary} part={part} />;

  if (
    testQuery.isLoading ||
    startMutation.isPending ||
    (sessionId !== null && practiceQuery.isLoading) ||
    !uiState
  ) {
    if (
      !testQuery.isError &&
      !startMutation.isError &&
      !practiceQuery.isError
    ) {
      return <ToeicReadingSessionSkeleton />;
    }
  }

  if (
    testQuery.isError ||
    startMutation.isError ||
    practiceQuery.isError ||
    !session ||
    !uiState ||
    !activeQuestion
  ) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center dark:border-rose-900 dark:bg-slate-950">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className="mt-4 text-lg font-semibold">
            {t("practice.unavailable")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("practice.loadError")}
          </p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("practice.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const readySession = session;
  const readyQuestion = activeQuestion;
  const readyUiState = uiState;
  const activeAnswer = answersByQuestion.get(readyQuestion.id);
  const activePart = readySession.content.parts.find(
    (item) => item.part === readyQuestion.part
  );
  const activeStimulus =
    readyQuestion.stimulusId === null
      ? null
      : (activePart?.stimuli.find(
          (stimulus) => stimulus.id === readyQuestion.stimulusId
        ) ?? null);
  const pendingOptionId =
    readyUiState.pendingOptionByQuestion[readyQuestion.id];
  const gradeFailed = readyUiState.failedQuestionId === readyQuestion.id;
  const firstQuestion = activeIndex <= 0;
  const lastQuestion = activeIndex === questions.length - 1;
  const completeAvailable =
    readySession.progress.total > 0 &&
    readySession.progress.answered === readySession.progress.total;
  const title = toeicReadingDisplayTitle({
    sourceSetName: readySession.content.sourceSetName,
    testTitle: readySession.content.title,
  });

  async function grade(optionId: number, retry = false) {
    if (activeAnswer || gradeMutation.isPending || (gradeFailed && !retry))
      return;
    setUiState((current) =>
      current
        ? selectToeicReadingPracticeOption(current, readyQuestion.id, optionId)
        : current
    );
    const requestKey =
      requestKeysRef.current.get(readyQuestion.id) ?? crypto.randomUUID();
    requestKeysRef.current.set(readyQuestion.id, requestKey);
    try {
      const result = await gradeMutation.mutateAsync({
        sessionId: readySession.id,
        payload: { questionId: readyQuestion.id, optionId, requestKey },
      });
      requestKeysRef.current.delete(readyQuestion.id);
      setUiState((current) =>
        current ? applyToeicReadingPracticeGrade(current, result) : current
      );
    } catch {
      setUiState((current) =>
        current
          ? failToeicReadingPracticeGrade(current, readyQuestion.id)
          : current
      );
    }
  }

  function retryGrade() {
    if (pendingOptionId !== undefined) {
      setUiState((current) =>
        current ? { ...current, failedQuestionId: null } : current
      );
      void grade(pendingOptionId, true);
    }
  }

  function selectQuestion(questionId: number) {
    if (!questions.some((question) => question.id === questionId)) return;
    setUiState((current) =>
      current ? { ...current, activeQuestionId: questionId } : current
    );
    updateMutation.mutate({
      sessionId: readySession.id,
      payload: { activeQuestionId: questionId, reviewQuestionIds },
    });
  }

  function moveQuestion(delta: -1 | 1) {
    const next = questions[activeIndex + delta];
    if (next) selectQuestion(next.id);
  }

  function toggleReview() {
    const nextReviewIds = reviewQuestionIds.includes(readyQuestion.id)
      ? reviewQuestionIds.filter((id) => id !== readyQuestion.id)
      : [...reviewQuestionIds, readyQuestion.id];
    setReviewQuestionIds(nextReviewIds);
    updateMutation.mutate({
      sessionId: readySession.id,
      payload: {
        activeQuestionId: readyQuestion.id,
        reviewQuestionIds: nextReviewIds,
      },
    });
  }

  async function completePractice() {
    if (!completeAvailable) return;
    try {
      setSummary(await completeMutation.mutateAsync(readySession.id));
    } catch {
      // Mutation state renders the retryable inline error below.
    }
  }

  const busy = gradeMutation.isPending || completeMutation.isPending;

  return (
    <ToeicReadingPracticeShell
      part={part}
      title={title}
      current={activeIndex + 1}
      total={questions.length}
      progress={readySession.progress}
    >
      <ToeicReadingWorkspace
        part={part}
        instruction={t(`session.part${part}Description`)}
        passage={
          part === 5 ? undefined : (
            <ToeicReadingPassagePane stimulus={activeStimulus} />
          )
        }
        question={
          <ToeicReadingQuestionPane
            question={readyQuestion}
            answer={activeAnswer}
            pendingOptionId={pendingOptionId}
            markedForReview={reviewQuestionIds.includes(readyQuestion.id)}
            grading={gradeMutation.isPending}
            gradeFailed={gradeFailed}
            onSelect={(optionId) => void grade(optionId)}
            onRetry={retryGrade}
            onToggleReview={toggleReview}
          />
        }
        feedback={<ToeicReadingFeedback answer={activeAnswer} />}
        questionDrawer={
          <ToeicReadingQuestionDrawer
            questions={questions}
            answers={readySession.answers}
            reviewQuestionIds={reviewQuestionIds}
            activeQuestionId={readyQuestion.id}
            current={activeIndex + 1}
            total={questions.length}
            onSelect={selectQuestion}
          />
        }
        questionSidebar={
          <ToeicReadingQuestionSidebar
            questions={questions}
            answers={readySession.answers}
            reviewQuestionIds={reviewQuestionIds}
            activeQuestionId={readyQuestion.id}
            current={activeIndex + 1}
            total={questions.length}
            onSelect={selectQuestion}
          />
        }
        firstQuestion={firstQuestion}
        lastQuestion={lastQuestion}
        completeAvailable={completeAvailable}
        busy={busy}
        onPrevious={() => moveQuestion(-1)}
        onNext={() => moveQuestion(1)}
        onComplete={() => void completePractice()}
      />

      {completeMutation.isError ? (
        <div
          className="fixed bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-md border border-rose-200 bg-rose-50 p-3 text-center text-sm text-rose-800 shadow-lg"
          role="alert"
        >
          {t("practice.completeError")}
        </div>
      ) : null}
    </ToeicReadingPracticeShell>
  );
}
