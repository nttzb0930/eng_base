"use client";

import type { ToeicWritingTaskSummary } from "@repo/shared";
import { ArrowRight, CheckCircle2, FilePenLine } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";

type ToeicWritingTaskCardProps = {
  task: ToeicWritingTaskSummary;
};

export function ToeicWritingTaskCard({ task }: ToeicWritingTaskCardProps) {
  const t = useTranslations("toeicWriting.card");
  const status = task.submitted
    ? "submitted"
    : task.hasDraft
      ? "draft"
      : "notStarted";

  return (
    <article className="bg-card flex min-w-0 flex-col rounded-2xl border p-5 shadow-sm transition-colors hover:border-emerald-500/50 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {task.submitted ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <FilePenLine className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t(status)}
        </span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        {t("taskNumber", { number: task.order })}
      </p>
      <h2 className="mt-2 break-words text-xl font-semibold">
        {task.part === 2
          ? task.title
          : task.requiredWords.map((word) => word.en).join(" · ")}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {t(`difficulty.${task.difficulty.toLowerCase()}`)}
      </p>

      <Link
        href={`/toeic/writing/part-${task.part}/${task.id}`}
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
      >
        {task.hasDraft ? t("continue") : t("start")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
