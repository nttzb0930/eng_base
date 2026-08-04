import type {
  ToeicReadingPart,
  ToeicReadingPracticeSummary,
} from "@repo/shared";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";

export function ToeicReadingPracticeSummary({
  summary,
  part,
}: {
  summary: ToeicReadingPracticeSummary;
  part: ToeicReadingPart;
}) {
  const t = useTranslations("toeicReading");
  const accuracy =
    summary.progress.total === 0
      ? 0
      : Math.round((summary.progress.correct / summary.progress.total) * 100);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8 dark:bg-slate-950">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-emerald-600"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {t("practice.completeTitle")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("practice.completeDescription", {
            correct: summary.progress.correct,
            total: summary.progress.total,
            accuracy,
          })}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
            <p className="text-xs font-semibold">{t("practice.correct")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.progress.correct}
            </p>
          </div>
          <div className="rounded-xl bg-rose-50 p-4 text-rose-900">
            <p className="text-xs font-semibold">{t("practice.incorrect")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.progress.incorrect}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.location.reload()}
            className="flex-1 gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("practice.restartPart")}
          </Button>
          <Button asChild variant="outline" className="flex-1 rounded-md">
            <Link href={`/learn/cert/toeic/reading?scope=${part}`}>
              {t("practice.returnToTests")}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
