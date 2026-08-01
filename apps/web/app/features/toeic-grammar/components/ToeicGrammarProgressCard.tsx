import type {
  ToeicGrammarPracticeMode,
  ToeicGrammarProgressSummary,
} from "@repo/shared";
import { ArrowRight, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";

type ToeicGrammarProgressCardProps = ToeicGrammarProgressSummary & {
  mode: ToeicGrammarPracticeMode;
  target: string;
  title: string;
  description?: string | null;
  eyebrow?: string;
  detailHref?: string;
};

export function ToeicGrammarProgressCard({
  mode,
  target,
  title,
  description,
  eyebrow,
  questionCount,
  correctCount,
  incorrectCount,
  unansweredCount,
  detailHref,
}: ToeicGrammarProgressCardProps) {
  const t = useTranslations("toeicGrammar.catalog.card");
  const answeredCount = correctCount + incorrectCount;
  const percentage = questionCount
    ? Math.min(100, (answeredCount / questionCount) * 100)
    : 0;

  return (
    <article className="bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-lg font-semibold leading-7">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-5">
              {description}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t("questions", { count: questionCount })}
        </span>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground font-medium">
            {t("progress")}
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {t("progressCount", {
              answered: answeredCount,
              total: questionCount,
            })}
          </span>
        </div>
        <div
          className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={questionCount}
          aria-valuenow={answeredCount}
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width]"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {correctCount}
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {incorrectCount}
          </span>
          <span className="bg-muted inline-flex items-center justify-center rounded-xl px-2 py-2">
            {t("unanswered", { count: unansweredCount })}
          </span>
        </div>

        <Link
          href={
            detailHref ??
            `/toeic/grammar/practice?mode=${mode}&target=${encodeURIComponent(target)}`
          }
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {detailHref
            ? t("openTopic")
            : answeredCount === 0
              ? t("start")
              : unansweredCount > 0
                ? t("continue")
                : t("practiceAgain")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
