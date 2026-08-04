import type { ToeicWritingSentenceVarietyFeedback } from "@repo/shared";
import { BookOpen, CheckCircle2, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";

export function ToeicWritingSentenceVarietyPanel({
  feedback,
}: {
  feedback: ToeicWritingSentenceVarietyFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full cursor-pointer select-none items-center justify-between text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          <span>{t("section.sentenceVariety")}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="min-h-0 overflow-hidden">
      <div className="mt-4 space-y-3 pt-2">
        <div className="space-y-2.5">
          {feedback.detected.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {t(`sentenceKind.${item.kind}`)}
                </Badge>
              </div>
              <p className="mt-2 text-sm italic text-foreground leading-relaxed">
                &ldquo;{item.evidence.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 text-sm text-foreground leading-relaxed dark:bg-emerald-950/20">
          {feedback.feedback}
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}
