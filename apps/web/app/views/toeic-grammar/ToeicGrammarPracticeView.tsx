"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ToeicGrammarAnswerPayload,
  ToeicGrammarPracticeMode,
} from "@repo/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicGrammarFeedback } from "@/app/features/toeic-grammar/components/ToeicGrammarFeedback";
import { ToeicGrammarPracticeSkeleton } from "@/app/features/toeic-grammar/components/ToeicGrammarPracticeSkeleton";
import { ToeicGrammarQuestion } from "@/app/features/toeic-grammar/components/ToeicGrammarQuestion";
import { ToeicGrammarQuestionNavigator } from "@/app/features/toeic-grammar/components/ToeicGrammarQuestionNavigator";
import {
  useSubmitToeicGrammarAnswer,
  useToeicGrammarPractice,
} from "@/app/features/toeic-grammar/hooks/use-toeic-grammar";
import {
  answerGrammarQuestionFailed,
  answerGrammarQuestionSucceeded,
  beginGrammarAnswer,
  createToeicGrammarSessionState,
  moveGrammarQuestion,
  retryGrammarAnswer,
  retryGrammarAnswerStarted,
  selectGrammarQuestion,
} from "@/app/features/toeic-grammar/toeic-grammar-session-state";

type ToeicGrammarPracticeViewProps = {
  mode: ToeicGrammarPracticeMode;
  target: string;
};

export function ToeicGrammarPracticeView({
  mode,
  target,
}: ToeicGrammarPracticeViewProps) {
  const t = useTranslations("toeicGrammar");
  const practiceQuery = useToeicGrammarPractice(mode, target);
  const answerMutation = useSubmitToeicGrammarAnswer();
  const [state, setState] = useState(() =>
    createToeicGrammarSessionState([], 0)
  );
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const initializedKeyRef = useRef<string | null>(null);
  const questionIds = useMemo(
    () => practiceQuery.data?.questions.map((question) => question.id) ?? [],
    [practiceQuery.data]
  );

  useEffect(() => {
    if (!practiceQuery.data) return;
    const identity = `${practiceQuery.data.snapshotVersion}:${mode}:${target}`;
    if (initializedKeyRef.current === identity) return;
    initializedKeyRef.current = identity;
    setState(
      createToeicGrammarSessionState(
        questionIds,
        practiceQuery.data.initialQuestionIndex
      )
    );
  }, [mode, practiceQuery.data, questionIds, target]);

  if (
    practiceQuery.isLoading ||
    (practiceQuery.data && state.activeQuestionId === null)
  )
    return <ToeicGrammarPracticeSkeleton />;
  if (practiceQuery.isError || !practiceQuery.data) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6">
        <section className="bg-card max-w-md rounded-2xl border border-rose-200 p-7 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className="mt-4 text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("practice.notAvailable")}
          </p>
          <Button
            type="button"
            onClick={() => practiceQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("error.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const practice = practiceQuery.data;
  const activeIndex = questionIds.indexOf(state.activeQuestionId ?? -1);
  const activeQuestion = practice.questions[activeIndex];
  if (!activeQuestion) return <ToeicGrammarPracticeSkeleton />;
  const currentFeedback = state.feedback[activeQuestion.id] ?? null;
  const pendingForCurrent =
    state.pendingAnswer?.questionId === activeQuestion.id
      ? state.pendingAnswer
      : null;
  const selectedOptionId =
    currentFeedback?.selectedOptionId ??
    pendingForCurrent?.selectedOptionId ??
    null;
  const latestFeedback = Object.values(state.feedback).at(-1);
  const progress = latestFeedback?.collectionProgress ?? practice.progress;
  const answeredCount = progress.correctCount + progress.incorrectCount;

  const sendAnswer = (payload: ToeicGrammarAnswerPayload) => {
    answerMutation.mutate(payload, {
      onSuccess: (result) =>
        setState((current) => answerGrammarQuestionSucceeded(current, result)),
      onError: () =>
        setState((current) => answerGrammarQuestionFailed(current)),
    });
  };
  const handleSelect = (selectedOption: number) => {
    const submissionKey = crypto.randomUUID();
    const next = beginGrammarAnswer(
      state,
      activeQuestion.id,
      selectedOption,
      submissionKey
    );
    if (next === state) return;
    setState(next);
    sendAnswer({
      submissionKey,
      snapshotVersion: practice.snapshotVersion,
      mode,
      target,
      questionId: activeQuestion.id,
      selectedOptionId: selectedOption,
    });
  };
  const handleRetry = () => {
    const retry = retryGrammarAnswer(state);
    if (!retry) return;
    setState((current) => retryGrammarAnswerStarted(current));
    sendAnswer({
      ...retry,
      snapshotVersion: practice.snapshotVersion,
      mode,
      target,
    });
  };
  const navigationLocked = state.pendingAnswer?.status === "pending";

  return (
    <main className="bg-background min-h-dvh pb-28">
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/learn/cert/toeic/reading/grammar"
            className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("practice.back")}
          </Link>
          <span className="text-sm font-semibold">
            {t("practice.position", {
              current: activeIndex + 1,
              total: practice.questions.length,
            })}
          </span>
        </div>
        <div className="bg-muted h-1.5">
          <div
            className="h-full bg-emerald-600 transition-[width]"
            style={{
              width: `${practice.questions.length ? (answeredCount / practice.questions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {t("practice.eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{practice.titleVi}</h1>
        </div>
        <ToeicGrammarQuestion
          question={activeQuestion}
          selectedOptionId={selectedOptionId}
          feedback={currentFeedback}
          pending={pendingForCurrent?.status === "pending"}
          onSelect={handleSelect}
        />
        {pendingForCurrent?.status === "error" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{t("practice.answerError")}</p>
            <Button type="button" onClick={handleRetry} className="mt-3 gap-2">
              <RotateCcw className="h-4 w-4" />
              {t("practice.retryAnswer")}
            </Button>
          </div>
        ) : null}
        {currentFeedback ? (
          <ToeicGrammarFeedback result={currentFeedback} />
        ) : null}
      </div>

      {navigatorOpen ? (
        <aside className="bg-card fixed inset-x-0 bottom-[73px] z-40 max-h-[55vh] overflow-y-auto border-y shadow-xl">
          <div className="mx-auto max-w-[1000px] px-4 py-5 sm:px-6">
            <ToeicGrammarQuestionNavigator
              questions={practice.questions}
              activeQuestionId={state.activeQuestionId}
              feedback={state.feedback}
              onSelect={(questionId) => {
                setState((current) =>
                  selectGrammarQuestion(current, questionIds, questionId)
                );
                setNavigatorOpen(false);
              }}
            />
          </div>
        </aside>
      ) : null}

      <footer className="bg-card fixed inset-x-0 bottom-0 z-50 border-t shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid min-h-[72px] max-w-[1000px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            disabled={activeIndex <= 0 || navigationLocked}
            onClick={() =>
              setState((current) =>
                moveGrammarQuestion(current, questionIds, -1)
              )
            }
            className="gap-2 justify-self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("practice.previous")}</span>
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => setNavigatorOpen((open) => !open)}
            aria-expanded={navigatorOpen}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            {activeIndex + 1}/{practice.questions.length}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={
              activeIndex >= practice.questions.length - 1 || navigationLocked
            }
            onClick={() =>
              setState((current) =>
                moveGrammarQuestion(current, questionIds, 1)
              )
            }
            className="gap-2 justify-self-end"
          >
            <span className="hidden sm:inline">{t("practice.next")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </main>
  );
}
