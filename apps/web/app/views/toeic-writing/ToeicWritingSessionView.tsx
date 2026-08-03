"use client";

import {
  getToeicWritingResponseLength,
  TOEIC_WRITING_RESPONSE_LIMITS,
  type ToeicWritingDraftPayload,
  type ToeicWritingPart,
  type ToeicWritingTaskDetail,
} from "@repo/shared";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ToeicWritingEditorPane } from "@/app/features/toeic-writing/components/ToeicWritingEditorPane";
import { ToeicWritingPromptPane } from "@/app/features/toeic-writing/components/ToeicWritingPromptPane";
import { ToeicWritingSessionFooter } from "@/app/features/toeic-writing/components/ToeicWritingSessionFooter";
import { ToeicWritingSessionSkeleton } from "@/app/features/toeic-writing/components/ToeicWritingSessionSkeleton";
import {
  useDeleteToeicWritingDraft,
  useSaveToeicWritingDraft,
  useSubmitToeicWriting,
  useToeicWritingDraft,
  useToeicWritingTask,
} from "@/app/features/toeic-writing/hooks/use-toeic-writing";
import { createToeicWritingDraftQueue } from "@/app/features/toeic-writing/toeic-writing-draft-queue";
import { createToeicWritingAutosaveScheduler } from "@/app/features/toeic-writing/toeic-writing-autosave-scheduler";
import {
  initialToeicWritingSessionState,
  reduceWritingSession,
} from "@/app/features/toeic-writing/toeic-writing-session-state";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { withLocale } from "@/app/i18n/paths";

type ToeicWritingSessionViewProps = {
  taskId: number;
  expectedPart: ToeicWritingPart;
};

export function ToeicWritingSessionView({
  taskId,
  expectedPart,
}: ToeicWritingSessionViewProps) {
  const t = useTranslations("toeicWriting.session");
  const taskQuery = useToeicWritingTask(taskId);
  const draftQuery = useToeicWritingDraft(taskId);

  if (taskQuery.isLoading || draftQuery.isLoading) {
    return <ToeicWritingSessionSkeleton />;
  }

  if (
    taskQuery.isError ||
    !taskQuery.data ||
    draftQuery.isError ||
    taskQuery.data.part !== expectedPart
  ) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <section className="bg-card rounded-md border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("loadErrorTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("loadErrorDescription")}
          </p>
          <Button
            type="button"
            onClick={() => {
              void Promise.all([taskQuery.refetch(), draftQuery.refetch()]);
            }}
            className="mt-5 gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("retry")}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <ToeicWritingWorkspace
      key={taskId}
      task={taskQuery.data}
      initialResponse={draftQuery.data?.responseText ?? ""}
    />
  );
}

type ToeicWritingWorkspaceProps = {
  task: ToeicWritingTaskDetail;
  initialResponse: string;
};

function ToeicWritingWorkspace({
  task,
  initialResponse,
}: ToeicWritingWorkspaceProps) {
  const t = useTranslations("toeicWriting.session");
  const currentLocale = useLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  const router = useRouter();
  const { mutateAsync: saveDraft } = useSaveToeicWritingDraft();
  const { mutateAsync: deleteDraft } = useDeleteToeicWritingDraft();
  const { mutateAsync: submitResponse, isError: submitIsError } =
    useSubmitToeicWriting();
  const submissionKeyRef = useRef<string | null>(null);
  const navigatingRef = useRef(false);
  const [state, dispatch] = useReducer(reduceWritingSession, {
    ...initialToeicWritingSessionState,
    responseText: initialResponse,
    hydrated: true,
    saveStatus: initialResponse ? "SAVED" : "IDLE",
  });

  const persistSnapshot = useCallback(
    async (snapshot: ToeicWritingDraftPayload) => {
      dispatch({ type: "saving" });
      try {
        if (snapshot.responseText.trim()) {
          await saveDraft({ taskId: task.id, payload: snapshot });
        } else {
          await deleteDraft(task.id);
        }
        dispatch({ type: "saved" });
      } catch (error) {
        dispatch({ type: "save-failed" });
        throw error;
      }
    },
    [deleteDraft, saveDraft, task.id]
  );
  const draftQueue = useMemo(
    () => createToeicWritingDraftQueue(persistSnapshot),
    [persistSnapshot]
  );
  const snapshot = useCallback(
    (): ToeicWritingDraftPayload => ({
      contentVersion: task.contentVersion,
      responseText: state.responseText,
    }),
    [state.responseText, task.contentVersion]
  );
  const autosave = useMemo(
    () => createToeicWritingAutosaveScheduler(draftQueue),
    [draftQueue]
  );

  useEffect(() => {
    if (!state.dirty || state.submitting) return;
    autosave.schedule(snapshot());
  }, [autosave, snapshot, state.dirty, state.submitting]);

  useEffect(() => () => autosave.dispose(), [autosave]);

  const saveNow = useCallback(async () => {
    try {
      await autosave.flush(snapshot());
    } catch {
      // The queue dispatches the visible save error without clearing editor text.
    }
  }, [autosave, snapshot]);

  const backToTasks = useCallback(async () => {
    if (navigatingRef.current || state.submitting) return;
    navigatingRef.current = true;
    try {
      await autosave.flush(snapshot(), { lock: true });
      router.push(withLocale("/learn/cert/toeic/writing", locale));
    } catch {
      autosave.unlock();
      navigatingRef.current = false;
    }
  }, [autosave, locale, router, snapshot, state.submitting]);

  const submit = useCallback(async () => {
    if (!state.responseText.trim()) return;
    dispatch({ type: "submitting" });
    try {
      await autosave.flush(snapshot(), { lock: true });
      submissionKeyRef.current ??= globalThis.crypto.randomUUID();
      const result = await submitResponse({
        taskId: task.id,
        payload: {
          ...snapshot(),
          submissionKey: submissionKeyRef.current,
        },
      });
      router.replace(
        withLocale(`/toeic/writing/submissions/${result.id}`, locale)
      );
    } catch {
      autosave.unlock();
      dispatch({ type: "submit-failed" });
    }
  }, [
    autosave,
    locale,
    router,
    snapshot,
    state.responseText,
    submitResponse,
    task.id,
  ]);

  const maxLength = TOEIC_WRITING_RESPONSE_LIMITS[task.part];
  const responseLength = getToeicWritingResponseLength(state.responseText);
  const canSubmit =
    responseLength > 0 && responseLength <= maxLength;

  return (
    <main className="min-h-dvh bg-slate-50/70 pb-20 dark:bg-slate-950/30">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => void backToTasks()}
            disabled={state.submitting}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("backToTasks")}</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{task.title}</p>
            <p className="text-muted-foreground text-xs">
              {t("taskNumber", { number: task.order })}
            </p>
          </div>
          <Badge variant="outline">{t("part", { part: task.part })}</Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ToeicWritingPromptPane task={task} />
          <ToeicWritingEditorPane
            responseText={state.responseText}
            maxLength={maxLength}
            saveStatus={state.saveStatus}
            disabled={state.submitting}
            onChange={(value) => dispatch({ type: "edit", value })}
            onRetry={() => void saveNow()}
          />
        </div>

        {submitIsError ? (
          <Alert className="mt-5 border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40">
            <AlertCircle
              className="mr-2 inline h-4 w-4 text-rose-600"
              aria-hidden="true"
            />
            <AlertTitle className="inline text-rose-800 dark:text-rose-200">
              {t("submitErrorTitle")}
            </AlertTitle>
            <AlertDescription className="text-rose-700 dark:text-rose-300">
              {t("submitErrorDescription")}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <ToeicWritingSessionFooter
        canSubmit={canSubmit}
        saving={state.saveStatus === "SAVING"}
        submitting={state.submitting}
        onBack={() => void backToTasks()}
        onSave={() => void saveNow()}
        onSubmit={() => void submit()}
      />
    </main>
  );
}
