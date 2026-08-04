"use client";

import { LoaderCircle, Save, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { getWritingFooterAvailability } from "../toeic-writing-session-state";

type ToeicWritingSessionFooterProps = {
  canSubmit: boolean;
  saving: boolean;
  actionPending: boolean;
  onBack?(): void;
  onSave(): void;
  onSubmit(): void;
  primaryLabel?: string;
  primaryPendingLabel?: string;
};

export function ToeicWritingSessionFooter({
  canSubmit,
  saving,
  actionPending,
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
    <footer className="z-40 shrink-0 border-t border-border/80 bg-background py-3 shadow-lg">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between sm:justify-end gap-2.5 px-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={availability.saveDisabled}
          className="h-10 flex-1 sm:flex-initial gap-2 rounded-xl border-border/80 px-4 text-xs font-medium sm:text-sm"
        >
          {saving ? (
            <LoaderCircle
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{t("saveNow")}</span>
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={availability.primaryDisabled}
          className="h-10 flex-1 sm:flex-initial gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:bg-emerald-600/50 sm:text-sm"
        >
          {actionPending ? (
            <LoaderCircle
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {actionPending
              ? (primaryPendingLabel ?? t("submitting"))
              : (primaryLabel ?? t("submit"))}
          </span>
        </Button>
      </div>
    </footer>
  );
}
