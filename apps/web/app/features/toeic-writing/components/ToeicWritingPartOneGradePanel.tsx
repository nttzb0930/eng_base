import type { ToeicWritingPartOneGradeResult } from "@repo/shared";
import {
  CheckCircle2,
  History,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { getPartOneGradePresentation } from "../toeic-writing-part-one-grading";

const checkOrder = ["grammar", "keywords", "relevance"] as const;

export function ToeicWritingPartOneGradePanel({
  grade,
  responseText,
  onRewrite,
}: {
  grade: ToeicWritingPartOneGradeResult;
  responseText?: string;
  onRewrite(): void;
}) {
  const t = useTranslations("toeicWriting.partOneGrading");
  const presentation = getPartOneGradePresentation(grade.score);
  const assisted = Object.values(grade.assistance).some(Boolean);
  const displayScoreLabel = grade.scoreLabel.replace(/^[\d/]+\s*-\s*/u, "");

  return (
    <section className="mt-5 space-y-4 animate-in fade-in-0 slide-in-from-top-3 duration-300 ease-out" aria-live="polite">
      <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="space-y-3">
          {assisted || grade.cached ? (
            <div className="flex flex-wrap items-center gap-2">
              {assisted ? (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 text-xs font-normal"
                >
                  {t("assisted")}
                </Badge>
              ) : null}
              {grade.cached ? (
                <Badge variant="secondary" className="text-xs">
                  {t("cached")}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {grade.score}/3
            </div>
            <h2 className="text-base sm:text-lg font-semibold leading-snug">{displayScoreLabel}</h2>
          </div>

          <p className="text-muted-foreground text-sm leading-6">
            {grade.overallFeedback}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={onRewrite}
            className="w-full sm:w-auto gap-2 rounded-md shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("rewrite")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {checkOrder.map((key) => {
          const check = grade.checks[key];
          const Icon =
            check.status === "PASS"
              ? CheckCircle2
              : check.status === "WARN"
                ? TriangleAlert
                : XCircle;
          return (
            <div key={key} className="bg-card rounded-md border p-4">
              <div className="flex items-start gap-3">
                <Icon
                  className={
                    check.status === "PASS"
                      ? "mt-0.5 h-5 w-5 text-emerald-600"
                      : check.status === "WARN"
                        ? "mt-0.5 h-5 w-5 text-amber-600"
                        : "mt-0.5 h-5 w-5 text-rose-600"
                  }
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold">{check.label}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {check.feedback}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-4 sm:p-5 dark:border-sky-900/80 dark:bg-sky-950/20">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            {presentation === "CORRECTION"
              ? t("correctionTitle")
              : t("improvementTitle")}
          </h3>
        </div>

        {responseText ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">{t("yourSentence")}</span> {responseText}
          </p>
        ) : null}

        <div className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
          {grade.suggestion.annotated && grade.suggestion.annotated.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {grade.suggestion.annotated.map((segment, index) => {
                if (
                  segment.status === "ADDED" ||
                  segment.status === "CORRECTED"
                ) {
                  return (
                    <span
                      key={index}
                      className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-900 dark:bg-sky-900/60 dark:text-sky-100"
                    >
                      {segment.text}
                    </span>
                  );
                }
                if (segment.status === "REMOVED") {
                  return (
                    <span
                      key={index}
                      className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-800 line-through dark:bg-rose-950/60 dark:text-rose-300"
                    >
                      {segment.text}
                    </span>
                  );
                }
                return <span key={index}>{segment.text}</span>;
              })}
            </div>
          ) : (
            <p className="font-medium text-foreground">
              {presentation === "CORRECTION"
                ? grade.suggestion.correctedSentence
                : grade.suggestion.alternativeSentence}
            </p>
          )}
        </div>

        {grade.suggestion.explanation ? (
          <p className="mt-3 text-xs italic text-muted-foreground leading-relaxed">
            {grade.suggestion.explanation}
          </p>
        ) : null}
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <History className="h-4 w-4" aria-hidden="true" />
        {t("savedToHistory")}
      </div>
    </section>
  );
}
