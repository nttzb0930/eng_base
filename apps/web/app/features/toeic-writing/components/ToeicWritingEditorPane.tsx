"use client";

import type { ToeicWritingSaveStatus } from "../toeic-writing-session-state";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";

type ToeicWritingEditorPaneProps = {
  responseText: string;
  maxLength: number;
  saveStatus: ToeicWritingSaveStatus;
  disabled?: boolean;
  onChange(value: string): void;
  onRetry(): void;
};

export function ToeicWritingEditorPane({
  responseText,
  maxLength,
  saveStatus,
  disabled,
  onChange,
  onRetry,
}: ToeicWritingEditorPaneProps) {
  const t = useTranslations("toeicWriting.session");
  const wordCount = responseText.trim()
    ? responseText.trim().split(/\s+/u).length
    : 0;
  const badgeVariant = saveStatus === "ERROR" ? "destructive" : "secondary";

  return (
    <section className="bg-card min-w-0 rounded-md border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("yourResponse")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("editorDescription")}
          </p>
        </div>
        <Badge variant={badgeVariant}>{t(`saveStatus.${saveStatus}`)}</Badge>
      </div>

      <label htmlFor="toeic-writing-response" className="sr-only">
        {t("yourResponse")}
      </label>
      <Textarea
        id="toeic-writing-response"
        autoFocus
        value={responseText}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("placeholder")}
        className="mt-5 min-h-[18rem] resize-y rounded-md text-base leading-7 sm:text-sm"
      />

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>{t("wordCount", { count: wordCount })}</span>
        <span>
          {t("characterCount", {
            count: responseText.length,
            max: maxLength,
          })}
        </span>
      </div>

      {saveStatus === "ERROR" ? (
        <Alert className="mt-5 border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40">
          <AlertCircle
            className="mr-2 inline h-4 w-4 text-rose-600"
            aria-hidden="true"
          />
          <AlertTitle className="inline text-rose-800 dark:text-rose-200">
            {t("saveErrorTitle")}
          </AlertTitle>
          <AlertDescription className="text-rose-700 dark:text-rose-300">
            {t("saveErrorDescription")}
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("retrySave")}
          </Button>
        </Alert>
      ) : null}
    </section>
  );
}
