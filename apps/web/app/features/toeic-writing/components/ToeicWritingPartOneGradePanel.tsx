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
  onRewrite,
}: {
  grade: ToeicWritingPartOneGradeResult;
  onRewrite(): void;
}) {
  const t = useTranslations("toeicWriting.partOneGrading");
  const presentation = getPartOneGradePresentation(grade.score);
  const assisted = Object.values(grade.assistance).some(Boolean);

  return (
    <section className="mt-5 space-y-4" aria-live="polite">
      <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {grade.score}/3
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{grade.scoreLabel}</h2>
              {grade.cached ? (
                <Badge variant="secondary">{t("cached")}</Badge>
              ) : null}
              {assisted ? (
                <Badge variant="outline">{t("assisted")}</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {grade.overallFeedback}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {t("quota", {
                remaining: grade.quota.remaining,
                limit: grade.quota.dailyLimit,
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRewrite}
            className="gap-2 rounded-md"
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

      <Alert className="rounded-md border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30">
        <Sparkles className="h-4 w-4 text-sky-600" aria-hidden="true" />
        <AlertDescription>
          <p className="font-semibold">
            {presentation === "CORRECTION"
              ? t("correctionTitle")
              : t("improvementTitle")}
          </p>
          <p className="mt-3 leading-7">
            {presentation === "CORRECTION"
              ? grade.suggestion.correctedSentence
              : grade.suggestion.alternativeSentence}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {grade.suggestion.explanation}
          </p>
        </AlertDescription>
      </Alert>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <History className="h-4 w-4" aria-hidden="true" />
        {t("savedToHistory")}
      </div>
    </section>
  );
}
