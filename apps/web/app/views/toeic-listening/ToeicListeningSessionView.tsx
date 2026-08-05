"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ToeicListeningAnswerCheckResult,
  ToeicListeningDraftPayload,
} from "@repo/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headphones,
  LayoutGrid,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { ToeicListeningNavigation } from "@/app/features/toeic-listening/components/ToeicListeningNavigation";
import { ToeicListeningMediaImage } from "@/app/features/toeic-listening/components/ToeicListeningMediaImage";
import { ToeicListeningPlayer } from "@/app/features/toeic-listening/components/ToeicListeningPlayer";
import { ToeicListeningQuestionGroup } from "@/app/features/toeic-listening/components/ToeicListeningQuestionGroup";
import { ToeicListeningSessionSkeleton } from "@/app/features/toeic-listening/components/ToeicListeningSessionSkeleton";
import { useExitModal } from "@/app/features/lessons/store/exit-modal.store";
import {
  useSaveToeicListeningDraft,
  useCheckToeicListeningAnswer,
  useSubmitToeicListeningAttempt,
  useToeicListeningDraft,
  useToeicListeningTest,
} from "@/app/features/toeic-listening/hooks/use-toeic-listening";
import { createToeicListeningDraftQueue } from "@/app/features/toeic-listening/toeic-listening-draft-queue";
import {
  scopeToPart,
  type ToeicListeningScope,
} from "@/app/features/toeic-listening/toeic-listening-scope";
import {
  buildToeicListeningSubmissionAnswers,
  createToeicListeningSessionState,
  getToeicListeningActiveQuestionId,
  groupToeicListeningQuestions,
  moveToeicListeningQuestion,
  restoreToeicListeningSessionState,
  selectToeicListeningAnswer,
  selectToeicListeningQuestion,
  toggleToeicListeningReview,
} from "@/app/features/toeic-listening/toeic-listening-session-state";
import { toeicReadingDisplayTitle } from "@/app/features/toeic-reading/toeic-reading-display-title";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type ToeicListeningSessionViewProps = {
  testId: number;
  scope: ToeicListeningScope;
};

export function ToeicListeningSessionView({
  testId,
  scope,
}: ToeicListeningSessionViewProps) {
  const t = useTranslations("toeicListening");
  const router = useRouter();
  const locale = useCurrentLocale();
  const { open: openExitModal } = useExitModal();
  const practicePart = scopeToPart(scope);
  const mode = practicePart === undefined ? "FULL" : "PRACTICE";
  const testQuery = useToeicListeningTest(testId, practicePart);
  const draftQuery = useToeicListeningDraft(testId, practicePart);
  const saveDraftMutation = useSaveToeicListeningDraft();
  const submitMutation = useSubmitToeicListeningAttempt();
  const checkAnswerMutation = useCheckToeicListeningAnswer();
  const [state, setState] = useState(createToeicListeningSessionState);
  const [answerFeedback, setAnswerFeedback] = useState<
    Record<number, ToeicListeningAnswerCheckResult>
  >({});
  const [checkingQuestionIds, setCheckingQuestionIds] = useState<number[]>([]);
  const [feedbackErrorQuestionIds, setFeedbackErrorQuestionIds] = useState<
    number[]
  >([]);
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [fullSessionStarted, setFullSessionStarted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const initializedKeyRef = useRef<string | null>(null);
  const feedbackRequestRef = useRef<Record<number, number>>({});
  const lastQueuedSnapshotRef = useRef<string | null>(null);
  const draftIdentity = `${testId}:${practicePart ?? "full"}`;
  const persistDraft = saveDraftMutation.mutateAsync;
  const draftQueue = useMemo(
    () =>
      createToeicListeningDraftQueue<ToeicListeningDraftPayload>(
        (payload) => persistDraft({ testId, payload }),
        {
          onSaving: () => setSaveStatus("saving"),
          onSaved: () => setSaveStatus("saved"),
          onError: () => setSaveStatus("error"),
        }
      ),
    [persistDraft, testId]
  );

  const groups = useMemo(
    () => (testQuery.data ? groupToeicListeningQuestions(testQuery.data) : []),
    [testQuery.data]
  );
  const questionIds = useMemo(
    () =>
      groups.flatMap((group) => group.questions.map((question) => question.id)),
    [groups]
  );
  const mediaIds = useMemo(
    () =>
      [
        ...new Set(
          groups.flatMap((group) => [
            ...(group.stimulus?.audioMediaId
              ? [group.stimulus.audioMediaId]
              : []),
            ...group.questions.flatMap((question) =>
              question.audioMediaId ? [question.audioMediaId] : []
            ),
            ...(group.stimulus?.imageMediaIds ?? []),
            ...group.questions.flatMap((question) => question.imageMediaIds),
          ])
        ),
      ].sort((left, right) => left - right),
    [groups]
  );
  const activeQuestionId = getToeicListeningActiveQuestionId(
    state,
    questionIds
  );
  const activeGroup = groups.find((group) =>
    group.questions.some((question) => question.id === activeQuestionId)
  );
  const activeQuestionIndex =
    activeQuestionId === null ? -1 : questionIds.indexOf(activeQuestionId);
  const groupIndex = activeGroup ? groups.indexOf(activeGroup) : -1;
  const activeMediaId = activeGroup ? getGroupAudioMediaId(activeGroup) : null;
  const activeImageMediaIds = activeGroup
    ? [
      ...new Set([
        ...(activeGroup.stimulus?.imageMediaIds ?? []),
        ...activeGroup.questions.flatMap(
          (question) => question.imageMediaIds
        ),
      ]),
    ]
    : [];

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
    const restored = restoreToeicListeningSessionState(
      draftQuery.data ?? null,
      questionIds,
      mediaIds
    );
    const payload = buildDraftPayload(
      restored,
      questionIds,
      testQuery.data.listeningSourceVersion,
      practicePart
    );
    setState(restored);
    lastQueuedSnapshotRef.current = payload ? JSON.stringify(payload) : null;
    initializedKeyRef.current = draftIdentity;
  }, [
    draftIdentity,
    draftQuery.data,
    draftQuery.isError,
    draftQuery.isLoading,
    mediaIds,
    practicePart,
    questionIds,
    testQuery.data,
  ]);

  useEffect(() => {
    if (initializedKeyRef.current !== draftIdentity || !testQuery.data) return;
    const payload = buildDraftPayload(
      state,
      questionIds,
      testQuery.data.listeningSourceVersion,
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
      document
        .getElementById(`toeic-listening-question-${activeQuestionId}`)
        ?.focus();
    });
  }, [activeQuestionId]);

  if (testQuery.isLoading || draftQuery.isLoading) {
    return <ToeicListeningSessionSkeleton />;
  }
  if (
    testQuery.isError ||
    draftQuery.isError ||
    !testQuery.data ||
    !activeGroup
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
              void Promise.all([testQuery.refetch(), draftQuery.refetch()])
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
  const answeredCount = Object.keys(state.answers).length;
  const submissionAnswers = buildToeicListeningSubmissionAnswers(
    state,
    questionIds
  );
  const complete = submissionAnswers !== null;
  const firstQuestion = activeQuestionIndex <= 0;
  const lastQuestion = activeQuestionIndex === questionIds.length - 1;

  async function submit() {
    if (!submissionAnswers) return;
    try {
      await draftQueue.flush();
      const result = await submitMutation.mutateAsync({
        submissionKey,
        testId: testData.id,
        listeningSourceVersion: testData.listeningSourceVersion,
        practicePart,
        answers: submissionAnswers,
      });
      router.push(withLocale(`/toeic/listening/results/${result.id}`, locale));
    } catch {
      setConfirmOpen(false);
    }
  }

  function startFullSession() {
    setFullSessionStarted(true);
  }

  async function selectAnswer(questionId: number, optionId: number) {
    setState((current) =>
      selectToeicListeningAnswer(current, questionId, optionId)
    );
    if (practicePart === undefined) return;

    const requestId = (feedbackRequestRef.current[questionId] ?? 0) + 1;
    feedbackRequestRef.current[questionId] = requestId;
    setAnswerFeedback((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    setCheckingQuestionIds((current) =>
      current.includes(questionId) ? current : [...current, questionId]
    );
    setFeedbackErrorQuestionIds((current) =>
      current.filter((id) => id !== questionId)
    );
    try {
      const result = await checkAnswerMutation.mutateAsync({
        testId: testData.id,
        payload: {
          listeningSourceVersion: testData.listeningSourceVersion,
          practicePart,
          questionId,
          optionId,
        },
      });
      if (feedbackRequestRef.current[questionId] === requestId) {
        setAnswerFeedback((current) => ({
          ...current,
          [questionId]: result,
        }));
      }
    } catch {
      if (feedbackRequestRef.current[questionId] === requestId) {
        setFeedbackErrorQuestionIds((current) => [
          ...current.filter((id) => id !== questionId),
          questionId,
        ]);
      }
    } finally {
      if (feedbackRequestRef.current[questionId] === requestId) {
        setCheckingQuestionIds((current) =>
          current.filter((id) => id !== questionId)
        );
      }
    }
  }

  if (mode === "FULL" && !fullSessionStarted) {
    const listPath = `/learn/cert/toeic/listening?scope=${scope}`;

    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <section className="bg-card shadow-xs border-border/80 w-full max-w-sm rounded-3xl border p-6 text-center sm:p-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Headphones className="h-8 w-8 stroke-[1.75]" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
            {t("session.readyTitle")}
          </h1>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed sm:text-sm">
            {t("session.fullStartDescription")}
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={startFullSession}
              className="h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 active:translate-y-px"
            >
              {t("session.startFull")}
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-border/80 bg-card text-foreground hover:bg-muted h-12 w-full rounded-xl text-sm font-semibold transition"
            >
              <Link href={listPath} className="inline-flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("list.back")}</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-dvh">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="flex w-full items-center gap-4 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => openExitModal(`/learn/cert/toeic/listening?scope=${scope}`)}
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
            {saveStatus !== "idle" ? (
              <p
                className={saveStatus === "error" ? "text-rose-600" : undefined}
              >
                {t(`session.draft${capitalize(saveStatus)}`)}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-73px)] pb-24 xl:grid-cols-2">
        <div className="min-w-0 border-b px-4 py-7 sm:px-8 xl:h-[calc(100dvh-73px)] xl:overflow-y-auto xl:border-b-0 xl:border-r xl:px-10">
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

          <section className="mt-7">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">
                {t("part", { part: activeGroup.part })}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t(`session.part${activeGroup.part}Description`)}
              </p>
            </div>

            {activeMediaId ? (
              <ToeicListeningPlayer
                key={`${activeMediaId}:${mode}`}
                mediaId={activeMediaId}
                mode={mode}
                completedMediaIds={state.completedMediaIds}
                initialPositionMs={
                  state.activeMediaId === activeMediaId
                    ? state.playbackPositionMs
                    : 0
                }
                autoStart={mode === "PRACTICE" || fullSessionStarted}
                onCheckpoint={(playback) =>
                  setState((current) => ({
                    ...current,
                    completedMediaIds: playback.completedMediaIds,
                    activeMediaId: playback.activeMediaId,
                    playbackPositionMs: playback.positionMs,
                  }))
                }
                onEnded={() => {
                  const nextGroup = groups[groupIndex + 1];
                  const nextQuestionId = nextGroup?.questions[0]?.id;
                  if (mode === "FULL" && nextQuestionId) {
                    setState((current) => ({
                      ...current,
                      activeQuestionId: nextQuestionId,
                    }));
                  }
                }}
              />
            ) : null}

            {activeImageMediaIds.length > 0 ? (
              <div className="mx-auto mt-6 grid max-w-2xl gap-4">
                {activeImageMediaIds.map((mediaId) => (
                  <ToeicListeningMediaImage
                    key={mediaId}
                    mediaId={mediaId}
                    alt={t("session.part1ImageAlt")}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <section className="min-w-0 px-4 py-7 sm:px-8 xl:h-[calc(100dvh-73px)] xl:overflow-y-auto xl:px-10">
          <div className="mx-auto max-w-3xl">
            <ToeicListeningQuestionGroup
              group={activeGroup}
              answers={state.answers}
              reviewQuestionIds={state.reviewQuestionIds}
              feedback={answerFeedback}
              checkingQuestionIds={checkingQuestionIds}
              feedbackErrorQuestionIds={feedbackErrorQuestionIds}
              onSelectAnswer={(questionId, optionId) =>
                void selectAnswer(questionId, optionId)
              }
              onToggleReview={(questionId) =>
                setState((current) =>
                  toggleToeicListeningReview(current, questionId)
                )
              }
            />

            {submitMutation.isError ? (
              <div
                role="alert"
                className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
              >
                <p className="font-semibold">{t("session.submitErrorTitle")}</p>
                <p className="mt-1">{t("session.submitErrorDescription")}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <nav
        aria-label={t("session.questionNavigation")}
        className="bg-background/95 fixed bottom-0 left-0 right-0 z-30 border-t px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Button
            type="button"
            disabled={firstQuestion}
            onClick={() =>
              setState((current) =>
                moveToeicListeningQuestion(current, questionIds, -1)
              )
            }
            className="gap-2 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {t("session.previousQuestion")}
            </span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            aria-label={t("session.questionNavigation")}
            onClick={() => setNavigationOpen(true)}
            className="gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {answeredCount}/{questionIds.length}
          </Button>

          {lastQuestion ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!complete || submitMutation.isPending}
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl sm:min-w-40"
            >
              {t("session.submit")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setState((current) =>
                  moveToeicListeningQuestion(current, questionIds, 1)
                )
              }
              className="gap-2 rounded-xl"
            >
              <span className="hidden sm:inline">
                {t("session.nextQuestion")}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </nav>

      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
        <SheetContent
          side="right"
          closeLabel={t("session.cancel")}
          className="w-[min(92vw,24rem)] overflow-y-auto p-4 sm:max-w-sm"
        >
          <SheetTitle className="sr-only">{t("session.navigation")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("session.questionNavigation")}
          </SheetDescription>
          <ToeicListeningNavigation
            test={testData}
            activeQuestionId={activeQuestionId}
            answers={state.answers}
            reviewQuestionIds={state.reviewQuestionIds}
            onSelect={(questionId) => {
              setState((current) =>
                selectToeicListeningQuestion(current, questionIds, questionId)
              );
              setNavigationOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

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
              onClick={() => void submit()}
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

function getGroupAudioMediaId(
  group: ReturnType<typeof groupToeicListeningQuestions>[number]
) {
  return (
    group.stimulus?.audioMediaId ??
    group.questions.find((question) => question.audioMediaId !== null)
      ?.audioMediaId ??
    null
  );
}

function buildDraftPayload(
  state: ReturnType<typeof createToeicListeningSessionState>,
  questionIds: number[],
  listeningSourceVersion: string,
  practicePart?: 1 | 2 | 3 | 4
): ToeicListeningDraftPayload | null {
  const activeQuestionId = getToeicListeningActiveQuestionId(
    state,
    questionIds
  );
  if (activeQuestionId === null) return null;
  return {
    listeningSourceVersion,
    ...(practicePart === undefined ? {} : { practicePart }),
    activeQuestionId,
    answers: questionIds.flatMap((questionId) => {
      const optionId = state.answers[questionId];
      return optionId === undefined ? [] : [{ questionId, optionId }];
    }),
    reviewQuestionIds: state.reviewQuestionIds.filter((questionId) =>
      questionIds.includes(questionId)
    ),
    completedMediaIds: state.completedMediaIds,
    activeMediaId: state.activeMediaId,
    playbackPositionMs: Math.max(0, Math.round(state.playbackPositionMs)),
  };
}

function capitalize(value: "saving" | "saved" | "error") {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as
    "Saving" | "Saved" | "Error";
}
