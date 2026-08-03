import type {
  ToeicWritingFeedbackStatus,
  ToeicWritingPartTwoGradeResult,
} from "@repo/shared";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ToeicWritingGrammarPanel } from "./ToeicWritingGrammarPanel";
import { ToeicWritingImprovedEmail } from "./ToeicWritingImprovedEmail";
import { ToeicWritingSentenceVarietyPanel } from "./ToeicWritingSentenceVarietyPanel";
import { ToeicWritingTaskCompletionPanel } from "./ToeicWritingTaskCompletionPanel";

export function ToeicWritingPartTwoResult({
  grade,
  onRewrite,
  onReplaceImprovedEmail,
}: {
  grade: ToeicWritingPartTwoGradeResult;
  onRewrite(): void;
  onReplaceImprovedEmail(): void;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const assisted = Object.values(grade.assistance).some(Boolean);

  return (
    <section className="mt-5 space-y-3" aria-live="polite" tabIndex={-1}>
      <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 text-2xl font-bold">
            {grade.score}/4
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
            className="gap-2 rounded-md"
            onClick={onRewrite}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("rewrite")}
          </Button>
        </div>
      </div>

      <ToeicWritingTaskCompletionPanel feedback={grade.taskCompletion} />
      <ToeicWritingSentenceVarietyPanel feedback={grade.sentenceVariety} />
      <FeedbackPanel
        title={t("section.tone")}
        status={grade.tone.status}
        text={grade.tone.feedback}
        extra={grade.tone.suggestedOpening}
      />
      <ToeicWritingGrammarPanel feedback={grade.grammar} />
      <FeedbackPanel
        title={t("section.paraphrase")}
        status={grade.paraphrase.status}
        text={grade.paraphrase.feedback}
        evidence={grade.paraphrase.copiedRanges.map((range) => range.text)}
      />
      <FeedbackPanel
        title={t("section.overall")}
        status="PASS"
        text={grade.overallFeedback}
        evidence={[...grade.strengths, ...grade.improvements]}
      />
      <ToeicWritingImprovedEmail
        email={grade.improvedEmail}
        onReplace={onReplaceImprovedEmail}
      />
    </section>
  );
}

function FeedbackPanel({
  title,
  status,
  text,
  extra,
  evidence = [],
}: {
  title: string;
  status: ToeicWritingFeedbackStatus;
  text: string;
  extra?: string | null;
  evidence?: string[];
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  return (
    <details className="bg-card rounded-md border p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
        {title}
        <Badge variant="outline">{t(`status.${status}`)}</Badge>
      </summary>
      <p className="text-muted-foreground mt-3 text-sm leading-6">{text}</p>
      {extra ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">{t("suggestedOpening")}: </span>
          {extra}
        </p>
      ) : null}
      {evidence.length ? (
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
          {evidence.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}
