import type {
  ToeicWritingFeedbackStatus,
  ToeicWritingPartTwoGradeResult,
} from "@repo/shared";
import { Award, CheckCircle2, ChevronDown, MessageSquareQuote, RotateCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
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
  onReplaceImprovedEmail?(): void;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const assisted = Object.values(grade.assistance).some(Boolean);

  return (
    <section className="mt-5 space-y-3" aria-live="polite" tabIndex={-1}>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 text-base sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {grade.score}/4
              </div>
              <div className="min-w-0 flex-1 sm:hidden">
                <h2 className="text-base font-bold leading-tight">{grade.scoreLabel}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {grade.cached ? (
                    <Badge variant="secondary" className="text-[11px] px-2 py-0">{t("cached")}</Badge>
                  ) : null}
                  {assisted ? (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 text-[11px] font-normal px-2 py-0">{t("assisted")}</Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="hidden sm:flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-snug">{grade.scoreLabel}</h2>
                {grade.cached ? (
                  <Badge variant="secondary" className="text-xs">{t("cached")}</Badge>
                ) : null}
                {assisted ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 text-xs font-normal">{t("assisted")}</Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                {grade.overallFeedback}
              </p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {t("quota", {
                  remaining: grade.quota.remaining,
                  limit: grade.quota.dailyLimit,
                })}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto gap-2 rounded-xl shrink-0"
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
        icon={MessageSquareQuote}
        status={grade.tone.status}
        text={grade.tone.feedback}
        extra={grade.tone.suggestedOpening}
      />
      <ToeicWritingGrammarPanel feedback={grade.grammar} />
      <FeedbackPanel
        title={t("section.paraphrase")}
        icon={Sparkles}
        status={grade.paraphrase.status}
        text={grade.paraphrase.feedback}
        evidence={grade.paraphrase.copiedRanges.map((range) => range.text)}
      />
      <FeedbackPanel
        title={t("section.overall")}
        icon={Award}
        status="PASS"
        text={grade.overallFeedback}
        evidence={[...grade.strengths, ...grade.improvements]}
        defaultOpen
      />
      <ToeicWritingImprovedEmail email={grade.improvedEmail} />
    </section>
  );
}

function FeedbackPanel({
  title,
  icon: Icon,
  status,
  text,
  extra,
  evidence = [],
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ElementType;
  status: ToeicWritingFeedbackStatus;
  text: string;
  extra?: string | null;
  evidence?: string[];
  defaultOpen?: boolean;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-card shadow-xs transition-all hover:border-slate-300 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-3 p-4 font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          <span className="truncate">{title}</span>
          <Badge
            variant="outline"
            className="shrink-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-normal dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          >
            {t(`status.${status}`)}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4">
            <p className="text-sm text-foreground leading-relaxed">{text}</p>
            {extra ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                <span className="font-semibold text-foreground">{t("suggestedOpening")}: </span>
                <span className="italic text-muted-foreground">{extra}</span>
              </div>
            ) : null}
            {evidence.length ? (
              <div className="space-y-1.5 pt-1">
                {evidence.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
