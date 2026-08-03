"use client";

import type {
  ToeicWritingCoachingKind,
  ToeicWritingCommunityItem,
  ToeicWritingPartTwoGradeResult,
  ToeicWritingPartTwoValidationIssue,
  ToeicWritingTaskDetail,
} from "@repo/shared";
import { BookOpen, FileText, Languages, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ToeicWritingCommunityPanel } from "./ToeicWritingCommunityPanel";
import { ToeicWritingEditorPane } from "./ToeicWritingEditorPane";
import { ToeicWritingGradeHistoryPanel } from "./ToeicWritingGradeHistoryPanel";
import { ToeicWritingOutlinePanel } from "./ToeicWritingOutlinePanel";
import { ToeicWritingPromptPane } from "./ToeicWritingPromptPane";
import { ToeicWritingPartTwoResult } from "./ToeicWritingPartTwoResult";
import { ToeicWritingSamplePanel } from "./ToeicWritingSamplePanel";
import { ToeicWritingVocabularyPanel } from "./ToeicWritingVocabularyPanel";
import {
  useRestoreToeicWritingCommunityResponse,
  useToeicWritingCoaching,
  useToeicWritingCommunity,
} from "../hooks/use-toeic-writing";
import {
  resolvePartTwoEditorChange,
  shouldConfirmCommunityRestore,
} from "../toeic-writing-coaching-state";
import type { ToeicWritingSaveStatus } from "../toeic-writing-session-state";

type Panel = ToeicWritingCoachingKind | "COMMUNITY";

type ToeicWritingPartTwoWorkspaceProps = {
  task: Extract<ToeicWritingTaskDetail, { part: 2 }>;
  responseText: string;
  saveStatus: ToeicWritingSaveStatus;
  grade: ToeicWritingPartTwoGradeResult | null;
  validationIssues: ToeicWritingPartTwoValidationIssue[];
  onResponseChange(value: string): void;
  onRetrySave(): void;
  onRewrite(): void;
  onReplaceImprovedEmail(value: string): void;
};

const panelIcons = {
  OUTLINE: BookOpen,
  VOCABULARY: Languages,
  SAMPLE: FileText,
  COMMUNITY: Users,
} as const;

export function ToeicWritingPartTwoWorkspace({
  task,
  responseText,
  saveStatus,
  grade,
  validationIssues,
  onResponseChange,
  onRetrySave,
  onRewrite,
  onReplaceImprovedEmail,
}: ToeicWritingPartTwoWorkspaceProps) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  const gradeT = useTranslations("toeicWriting.partTwoGrading");
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [pendingRestore, setPendingRestore] =
    useState<ToeicWritingCommunityItem | null>(null);
  const [pendingImprovedEmail, setPendingImprovedEmail] = useState<
    string | null
  >(null);
  const gradeResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!grade) return;
    gradeResultRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    gradeResultRef.current?.focus({ preventScroll: true });
  }, [grade]);
  const outline = useToeicWritingCoaching(
    task.id,
    task.contentVersion,
    "OUTLINE",
    activePanel === "OUTLINE"
  );
  const vocabulary = useToeicWritingCoaching(
    task.id,
    task.contentVersion,
    "VOCABULARY",
    activePanel === "VOCABULARY"
  );
  const sample = useToeicWritingCoaching(
    task.id,
    task.contentVersion,
    "SAMPLE",
    true
  );
  const community = useToeicWritingCommunity(
    task.id,
    activePanel === "COMMUNITY"
  );
  const restore = useRestoreToeicWritingCommunityResponse();
  const communityItems = useMemo(
    () => community.data?.pages.flatMap((page) => page.items) ?? [],
    [community.data]
  );

  const changeResponse = (nextValue: string) => {
    const result = resolvePartTwoEditorChange(responseText, nextValue);
    setLimitReached(!result.accepted);
    if (result.accepted) onResponseChange(result.value);
  };

  const restoreResponse = async (item: ToeicWritingCommunityItem) => {
    if (
      shouldConfirmCommunityRestore(responseText) &&
      pendingRestore?.submissionId !== item.submissionId
    ) {
      setPendingRestore(item);
      return;
    }
    const result = await restore.mutateAsync({
      taskId: task.id,
      submissionId: item.submissionId,
      contentVersion: task.contentVersion,
    });
    onResponseChange(result.responseText);
    setPendingRestore(null);
  };

  const panelQuery =
    activePanel === "OUTLINE"
      ? outline
      : activePanel === "VOCABULARY"
        ? vocabulary
        : sample;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <ToeicWritingPromptPane task={task} />
      <div className="min-w-0 space-y-4">
        <ToeicWritingEditorPane
          responseText={responseText}
          maxLength={2_200}
          wordRange={{ min: 50, max: 300 }}
          limitReached={limitReached}
          saveStatus={saveStatus}
          disabled={false}
          onChange={changeResponse}
          onRetry={onRetrySave}
        />

        {validationIssues.length ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-semibold">{gradeT("validation.title")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {validationIssues.map((issue) => (
                <li key={issue.code}>{gradeT(`validation.${issue.code}`)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="bg-card rounded-md border p-3 sm:p-4">
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="tablist"
            aria-label={t("panelLabel")}
          >
            {(["OUTLINE", "VOCABULARY", "SAMPLE", "COMMUNITY"] as const).map(
              (panel) => {
                const Icon = panelIcons[panel];
                return (
                  <Button
                    key={panel}
                    type="button"
                    size="sm"
                    variant={activePanel === panel ? "secondary" : "outline"}
                    className="gap-2 rounded-md"
                    onClick={() =>
                      setActivePanel((current) =>
                        current === panel ? null : panel
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(`panel.${panel}`)}
                  </Button>
                );
              }
            )}
          </div>

          {activePanel ? (
            <div className="mt-4 border-t pt-4">
              {activePanel === "COMMUNITY" ? (
                <ToeicWritingCommunityPanel
                  items={communityItems}
                  loading={community.isLoading}
                  error={community.isError || restore.isError}
                  hasMore={community.hasNextPage}
                  loadingMore={community.isFetchingNextPage}
                  restoringId={
                    restore.isPending
                      ? (pendingRestore?.submissionId ?? null)
                      : null
                  }
                  onRetry={() => void community.refetch()}
                  onLoadMore={() => void community.fetchNextPage()}
                  onRestore={(item) => void restoreResponse(item)}
                />
              ) : panelQuery.isLoading ? (
                <PanelSkeleton />
              ) : panelQuery.isError || !panelQuery.data ? (
                <PanelError onRetry={() => void panelQuery.refetch()} />
              ) : panelQuery.data.kind === "OUTLINE" ? (
                <ToeicWritingOutlinePanel data={panelQuery.data} />
              ) : panelQuery.data.kind === "VOCABULARY" ? (
                <ToeicWritingVocabularyPanel data={panelQuery.data} />
              ) : (
                <ToeicWritingSamplePanel data={panelQuery.data} />
              )}
            </div>
          ) : null}
        </section>

        {grade ? (
          <div
            ref={gradeResultRef}
            tabIndex={-1}
            className="scroll-mt-24 outline-none"
          >
            <ToeicWritingPartTwoResult
              grade={grade}
              onRewrite={onRewrite}
              onReplaceImprovedEmail={() =>
                setPendingImprovedEmail(grade.improvedEmail.text)
              }
            />
          </div>
        ) : null}
        <ToeicWritingGradeHistoryPanel taskId={task.id} maxScore={4} />
      </div>

      <Dialog
        open={pendingRestore !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null);
        }}
      >
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>{t("confirmRestoreTitle")}</DialogTitle>
            <DialogDescription>
              {t("confirmRestoreDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={() => setPendingRestore(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-md"
              disabled={!pendingRestore || restore.isPending}
              onClick={() => {
                if (pendingRestore) void restoreResponse(pendingRestore);
              }}
            >
              {restore.isPending ? t("restoring") : t("confirmRestore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingImprovedEmail !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImprovedEmail(null);
        }}
      >
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>{gradeT("confirmImprovedEmailTitle")}</DialogTitle>
            <DialogDescription>
              {gradeT("confirmImprovedEmailDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={() => setPendingImprovedEmail(null)}
            >
              {gradeT("cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-md"
              disabled={!pendingImprovedEmail}
              onClick={() => {
                if (pendingImprovedEmail) {
                  onReplaceImprovedEmail(pendingImprovedEmail);
                  setPendingImprovedEmail(null);
                }
              }}
            >
              {gradeT("confirmImprovedEmail")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="bg-muted h-36 animate-pulse rounded-md" role="status" />
  );
}

function PanelError({ onRetry }: { onRetry(): void }) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  return (
    <div className="rounded-md border border-rose-200 p-5 text-center dark:border-rose-900">
      <p className="text-sm text-rose-700 dark:text-rose-300">
        {t("loadError")}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3 rounded-md"
        onClick={onRetry}
      >
        {t("retry")}
      </Button>
    </div>
  );
}
