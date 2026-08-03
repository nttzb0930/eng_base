"use client";

import { ArrowLeft, LoaderCircle, Save, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { getWritingFooterAvailability } from "../toeic-writing-session-state";

type ToeicWritingSessionFooterProps = {
  canSubmit: boolean;
  saving: boolean;
  actionPending: boolean;
  onBack(): void;
  onSave(): void;
  onSubmit(): void;
  primaryLabel?: string;
  primaryPendingLabel?: string;
};

export function ToeicWritingSessionFooter({
  canSubmit,
  saving,
  actionPending,
  onBack,
  onSave,
  onSubmit,
  primaryLabel,
  primaryPendingLabel,
}: ToeicWritingSessionFooterProps) {
  const t = useTranslations("toeicWriting.session");
  const availability = getWritingFooterAvailability({
    canSubmit,
    saving,
    actionPending,
  });

  return (
    <footer className="bg-background/95 supports-[backdrop-filter]:bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          disabled={availability.backDisabled}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToTasks")}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSave}
            disabled={availability.saveDisabled}
            className="gap-2 rounded-md"
          >
            {saving ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{t("saveNow")}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onSubmit}
            disabled={availability.primaryDisabled}
            className="gap-2 rounded-md"
          >
            {actionPending ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {actionPending
              ? (primaryPendingLabel ?? t("submitting"))
              : (primaryLabel ?? t("submit"))}
          </Button>
        </div>
      </div>
    </footer>
  );
}
