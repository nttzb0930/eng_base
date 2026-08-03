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
    <footer className="bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky bottom-0 z-30 border-t py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-end gap-2 px-4 sm:px-6">
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
    </footer>
  );
}
