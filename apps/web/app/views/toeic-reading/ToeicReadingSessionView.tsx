"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ToeicReadingDraftPayload } from "@repo/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ToeicPartNavigation } from "@/app/features/toeic-reading/components/ToeicPartNavigation";
import { ToeicQuestion } from "@/app/features/toeic-reading/components/ToeicQuestion";
import { ToeicReadingSessionSkeleton } from "@/app/features/toeic-reading/components/ToeicReadingSessionSkeleton";
import { useExitModal } from "@/app/features/lessons/store/exit-modal.store";
import { ToeicStimulus } from "@/app/features/toeic-reading/components/ToeicStimulus";
import {
  useSubmitToeicReadingAttempt,
  useSaveToeicReadingDraft,
  useToeicReadingDraft,
  useToeicReadingTest,
} from "@/app/features/toeic-reading/hooks/use-toeic-reading";
import { createToeicReadingDraftQueue } from "@/app/features/toeic-reading/toeic-reading-draft-queue";
import { toeicReadingDisplayTitle } from "@/app/features/toeic-reading/toeic-reading-display-title";
import {
  scopeToPart,
  type ToeicReadingScope,
} from "@/app/features/toeic-reading/toeic-reading-scope";
import {
  buildToeicSubmissionAnswers,
  createToeicReadingSessionState,
  getToeicActiveQuestionId,
  getToeicAnsweredCount,
  moveToeicQuestion,
  restoreToeicReadingSessionState,
  selectToeicAnswer,
  selectToeicQuestion,
  toggleToeicReview,
} from "@/app/features/toeic-reading/toeic-reading-session-state";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type ToeicReadingSessionViewProps = {
  testId: number;
  scope: ToeicReadingScope;
};

export function ToeicReadingSessionView({
  testId,
  scope,
}: ToeicReadingSessionViewProps) {
  const t = useTranslations("toeicReading");
  const router = useRouter();
  const locale = useCurrentLocale();
  const { open: openExitModal } = useExitModal();
  const practicePart = scopeToPart(scope);
  const testQuery = useToeicReadingTest(testId, practicePart);
  const draftQuery = useToeicReadingDraft(testId, practicePart);
  const saveDraftMutation = useSaveToeicReadingDraft();
  const submitMutation = useSubmitToeicReadingAttempt();
  const [state, setState] = useState(createToeicReadingSessionState);
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const initializedKeyRef = useRef<string | null>(null);
  const lastQueuedSnapshotRef = useRef<string | null>(null);
  const draftIdentity = `${testId}:${practicePart ?? "full"}`;
  const persistDraft = saveDraftMutation.mutateAsync;
  const draftQueue = useMemo(() => {
    const queueIdentity = draftIdentity;
    return createToeicReadingDraftQueue<ToeicReadingDraftPayload>(
      (payload) => {
        if (queueIdentity.length === 0) return Promise.resolve();
        return persistDraft({ testId, payload });
      },
      {
        onSaving: () => setSaveStatus("saving"),
        onSaved: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("error"),
      }
    );
  }, [draftIdentity, persistDraft, testId]);

  const questionContexts = useMemo(
    () =>
      (testQuery.data?.parts ?? [])
        .flatMap((part) =>
          part.questions.map((question) => ({
            part: part.part,
            question,
            stimulus:
              question.stimulusId === null
                ? null
                : (part.stimuli.find(
                  (stimulus) => stimulus.id === question.stimulusId
                ) ?? null),
          }))
        )
        .sort((left, right) => left.question.number - right.question.number),
    [testQuery.data]
  );
  const questionIds = useMemo(
    () => questionContexts.map(({ question }) => question.id),
    [questionContexts]
  );
  const activeQuestionId = getToeicActiveQuestionId(state, questionIds);
  const activeQuestion = questionContexts.find(
    ({ question }) => question.id === activeQuestionId
  );
  const activeQuestionIndex = activeQuestion
    ? questionIds.indexOf(activeQuestion.question.id)
    : -1;
  const firstQuestion = activeQuestionIndex <= 0;
  const lastQuestion =
    activeQuestionIndex >= 0 && activeQuestionIndex === questionIds.length - 1;

  useEffect(() => {
    if (
      initializedKeyRef.current === draftIdentity ||
      !testQuery.data ||
      draftQuery.isLoading ||
      draftQuery.isError ||
      questionIds.length === 0
    ) {
      return;
    }
    const restored = restoreToeicReadingSessionState(
      draftQuery.data ?? null,
      questionIds
    );
    const payload = buildDraftPayload(
      restored,
      questionIds,
      testQuery.data.sourceVersion,
      practicePart
    );
    setState(restored);
    lastQueuedSnapshotRef.current = JSON.stringify(payload);
    initializedKeyRef.current = draftIdentity;
  }, [
    draftQuery.data,
    draftQuery.isError,
    draftQuery.isLoading,
    draftIdentity,
    practicePart,
    questionIds,
    testQuery.data,
  ]);

  useEffect(() => {
    if (initializedKeyRef.current !== draftIdentity || !testQuery.data) {
      return;
    }
    const payload = buildDraftPayload(
      state,
      questionIds,
      testQuery.data.sourceVersion,
      practicePart
    );
    if (!payload) return;
    const serialized = JSON.stringify(payload);
    if (serialized === lastQueuedSnapshotRef.current) return;
    lastQueuedSnapshotRef.current = serialized;
    draftQueue.push(payload);
  }, [
    draftIdentity,
    draftQueue,
    practicePart,
    questionIds,
    state,
    testQuery.data,
  ]);

  useEffect(() => {
    if (activeQuestionId === null) return;
    requestAnimationFrame(() => {
      document.getElementById(`toeic-question-${activeQuestionId}`)?.focus();
    });
  }, [activeQuestionId]);

  if (testQuery.isLoading || draftQuery.isLoading) {
    return <ToeicReadingSessionSkeleton />;
  }
  if (
    testQuery.isError ||
    draftQuery.isError ||
    !testQuery.data ||
    !activeQuestion
  ) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6">
        <section className="bg-card max-w-md rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className="mt-4 text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("session.notAvailable")}
          </p>
          <Button
            type="button"
            onClick={() =>
              Promise.all([testQuery.refetch(), draftQuery.refetch()])
            }
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const testData = testQuery.data;
  const answeredCount = getToeicAnsweredCount(state);
  const submissionAnswers = buildToeicSubmissionAnswers(state, questionIds);
  const complete = submissionAnswers !== null;
  const conflict = isVersionConflict(submitMutation.error);

  async function submit() {
    if (!submissionAnswers) return;
    try {
      await draftQueue.flush();
      const result = await submitMutation.mutateAsync({
        submissionKey,
        testId: testData.id,
        sourceVersion: testData.sourceVersion,
        practicePart,
        answers: submissionAnswers,
      });
      router.push(withLocale(`/toeic/reading/results/${result.id}`, locale));
    } catch {
      setConfirmOpen(false);
    }
  }

  return (
    <main className="bg-background min-h-dvh">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => openExitModal(`/learn/cert/toeic/reading?scope=${scope}`)}
            className="text-muted-foreground group inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            <span>{t("session.back")}</span>
          </Button>
          <div
            className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questionIds.length}
            aria-valuenow={answeredCount}
            aria-label={t("session.progressLabel")}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width]"
              style={{
                width: `${questionIds.length
                    ? (answeredCount / questionIds.length) * 100
                    : 0
                  }%`,
              }}
            />
          </div>
          <div className="text-muted-foreground shrink-0 text-right text-xs font-semibold">
            <p>
              {t("session.questionPosition", {
                current: activeQuestionIndex + 1,
                total: questionIds.length,
              })}
            </p>
            <p className="hidden sm:block">
              {t("session.answeredPosition", {
                answered: answeredCount,
                total: questionIds.length,
              })}
            </p>
            {saveStatus !== "idle" ? (
              <p
                className={
                  saveStatus === "error"
                    ? "text-rose-600 dark:text-rose-400"
                    : undefined
                }
              >
                {t(`session.draft${capitalize(saveStatus)}`)}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-7 sm:px-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {toeicReadingDisplayTitle({
                sourceSetName: testData.sourceSetName,
                testTitle: testData.title,
              })}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {practicePart === undefined
                ? t("session.description", { count: testData.questionCount })
                : t("session.partDescription", {
                  count: testData.questionCount,
                  part: practicePart,
                })}
            </p>
          </header>

          <section
            className="mt-7"
            aria-labelledby={`toeic-part-${activeQuestion.part}`}
          >
            <div className="mb-5">
              <h2
                id={`toeic-part-${activeQuestion.part}`}
                className="text-xl font-semibold"
              >
                {t("part", { part: activeQuestion.part })}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t(`session.part${activeQuestion.part}Description`)}
              </p>
            </div>

            <div className="space-y-4">
              {activeQuestion.stimulus ? (
                <ToeicStimulus stimulus={activeQuestion.stimulus} />
              ) : null}
              <ToeicQuestion
                key={activeQuestion.question.id}
                question={activeQuestion.question}
                selectedOptionId={state.answers[activeQuestion.question.id]}
                markedForReview={state.reviewQuestionIds.includes(
                  activeQuestion.question.id
                )}
                onSelect={(optionId) =>
                  setState((current) =>
                    selectToeicAnswer(
                      current,
                      activeQuestion.question.id,
                      optionId
                    )
                  )
                }
                onToggleReview={() =>
                  setState((current) =>
                    toggleToeicReview(current, activeQuestion.question.id)
                  )
                }
              />
            </div>
          </section>

          {submitMutation.isError ? (
            <div
              role="alert"
              className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
            >
              <p className="font-semibold">
                {conflict
                  ? t("session.versionConflictTitle")
                  : t("session.submitErrorTitle")}
              </p>
              <p className="mt-1">
                {conflict
                  ? t("session.versionConflictDescription")
                  : t("session.submitErrorDescription")}
              </p>
              {conflict ? (
                <Button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3"
                >
                  {t("session.reload")}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-4 border-t pt-6">
            <Button
              type="button"
              disabled={firstQuestion}
              onClick={() =>
                setState((current) =>
                  moveToeicQuestion(current, questionIds, -1)
                )
              }
              className="gap-2 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("session.previousQuestion")}
            </Button>

            {lastQuestion ? (
              <Button
                type="button"
                variant="secondary"
                disabled={!complete || submitMutation.isPending}
                onClick={() => setConfirmOpen(true)}
                className="min-w-40 rounded-xl"
              >
                {t("session.submit")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setState((current) =>
                    moveToeicQuestion(current, questionIds, 1)
                  )
                }
                className="gap-2 rounded-xl"
              >
                {t("session.nextQuestion")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <aside className="order-first xl:order-last">
          <div className="xl:sticky xl:top-24">
            <ToeicPartNavigation
              test={testData}
              state={state}
              activeQuestionId={activeQuestionId}
              onSelectQuestion={(questionId) =>
                setState((current) =>
                  selectToeicQuestion(current, questionIds, questionId)
                )
              }
            />
          </div>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          closeLabel={t("session.cancel")}
          className="rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{t("session.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("session.confirmDescription", {
                answered: answeredCount,
                total: questionIds.length,
                review: state.reviewQuestionIds.length,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" onClick={() => setConfirmOpen(false)}>
              {t("session.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitMutation.isPending}
              onClick={submit}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {t("session.confirmSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function isVersionConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return false;
  }
  const response = error.response;
  return (
    typeof response === "object" &&
    response !== null &&
    "status" in response &&
    response.status === 409
  );
}

function buildDraftPayload(
  state: ReturnType<typeof createToeicReadingSessionState>,
  questionIds: number[],
  sourceVersion: string,
  practicePart?: 5 | 6 | 7
): ToeicReadingDraftPayload | null {
  const activeQuestionId = getToeicActiveQuestionId(state, questionIds);
  if (activeQuestionId === null) return null;
  return {
    sourceVersion,
    ...(practicePart === undefined ? {} : { practicePart }),
    activeQuestionId,
    answers: questionIds.flatMap((questionId) => {
      const optionId = state.answers[questionId];
      return optionId === undefined ? [] : [{ questionId, optionId }];
    }),
    reviewQuestionIds: state.reviewQuestionIds.filter((questionId) =>
      questionIds.includes(questionId)
    ),
  };
}

function capitalize(value: "saving" | "saved" | "error") {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as
    "Saving" | "Saved" | "Error";
}
