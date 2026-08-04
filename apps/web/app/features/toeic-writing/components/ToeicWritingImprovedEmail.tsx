import type { ToeicWritingImprovedEmail as ImprovedEmail } from "@repo/shared";
import { Replace, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";

export function ToeicWritingImprovedEmail({
  email,
  onReplace,
}: {
  email: ImprovedEmail;
  onReplace?(): void;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  return (
    <section className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-purple-50/40 to-indigo-50/50 p-4 sm:p-5 dark:border-violet-900/80 dark:from-violet-950/30 dark:to-indigo-950/20 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-violet-800 dark:text-violet-200">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <h3 className="font-semibold text-base">{t("section.improvedEmail")}</h3>
        </div>
        {onReplace ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2 rounded-xl border-violet-300 bg-white/80 text-violet-900 font-medium hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/50 dark:text-violet-100"
            onClick={onReplace}
          >
            <Replace className="h-4 w-4" aria-hidden="true" />
            {t("replace")}
          </Button>
        ) : null}
      </div>
      <div className="mt-4 rounded-xl border border-violet-100 bg-white/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/40">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{email.text}</p>
      </div>
      {email.differences.length ? (
        <div className="mt-4 border-t border-violet-200/60 pt-3 dark:border-violet-900/60">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">{t("differences")}</p>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
            {email.differences.map((difference, index) => (
              <li key={`${difference}-${index}`}>{difference}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
