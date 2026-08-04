import type { ToeicWritingGrammarFeedback } from "@repo/shared";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";

export function ToeicWritingGrammarPanel({
  feedback,
}: {
  feedback: ToeicWritingGrammarFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  const errorCount = feedback.errors.length;
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full cursor-pointer select-none items-center justify-between text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />
          <span>{t("section.grammar")}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ({errorCount} {errorCount === 1 ? "lỗi" : "lỗi"})
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="min-h-0 overflow-hidden">
      <div className="mt-4 space-y-3 pt-2">
        <p className="text-sm text-foreground leading-relaxed">
          {feedback.feedback}
        </p>
        {errorCount === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>Không có lỗi ngữ pháp nghiêm trọng.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {feedback.errors.map((error, index) => (
              <article
                key={`${error.evidence.start}-${index}`}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/40"
              >
                <Badge
                  variant={error.severity === "SERIOUS" ? "destructive" : "outline"}
                  className="rounded-full text-xs font-normal"
                >
                  {t(`grammarSeverity.${error.severity}`)}
                </Badge>
                <p className="mt-2 text-sm text-rose-600 line-through dark:text-rose-400 font-medium">
                  {error.evidence.text}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {error.correction}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {error.explanation}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
      </div>
      </div>
    </section>
  );
}
