"use client";

import type { ToeicWritingTaskCompletionFeedback } from "@repo/shared";
import { CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/utils/cn";

const statusIcon = {
  MET: CheckCircle2,
  PARTIAL: CircleAlert,
  MISSING: XCircle,
} as const;

export function ToeicWritingTaskCompletionPanel({
  feedback,
}: {
  feedback: ToeicWritingTaskCompletionFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-card shadow-xs transition-all hover:border-slate-300 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-3 p-4 font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
      >
        <div className="flex min-w-0 items-center gap-2">
          <ClipboardCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="truncate">{t("section.taskCompletion")}</span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {feedback.completedCount}/{feedback.totalCount} {t("requirementStatus.MET")}
          </span>
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
            {feedback.requirements.map((requirement) => {
              const Icon = statusIcon[requirement.status];
              return (
                <article
                  key={requirement.requirementId}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/40"
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{requirement.comment}</p>
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-normal dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          {t(`requirementStatus.${requirement.status}`)}
                        </Badge>
                      </div>
                      {requirement.evidence.map((evidence, index) => (
                        <div
                          key={`${evidence.start}-${evidence.end}-${index}`}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-50/40 p-3 dark:bg-emerald-950/20"
                        >
                          <span className="block text-[11px] font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-400">
                            {t("yourSentence")}
                          </span>
                          <p className="mt-1 text-sm text-foreground leading-relaxed">
                            {evidence.text}
                          </p>
                        </div>
                      ))}
                      {requirement.suggestedFix ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{t("suggestedFix")}: </span>
                          {requirement.suggestedFix}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
