"use client";

import type { ToeicWritingPartTwoTaskSummary } from "@repo/shared";
import { ArrowRight, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";

type ToeicWritingPartTwoCardProps = {
  task: ToeicWritingPartTwoTaskSummary;
  locale: string;
};

export function ToeicWritingPartTwoCard({
  task,
  locale,
}: ToeicWritingPartTwoCardProps) {
  const t = useTranslations("toeicWriting.card");
  const action = task.submitted
    ? t("review")
    : task.hasDraft
      ? t("continue")
      : t("start");

  return (
    <article className="bg-card flex min-h-52 min-w-0 flex-col rounded-md border transition-colors hover:border-emerald-500/60">
      <div className="flex flex-1 flex-col p-5">
        <Mail className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 break-words text-base font-semibold leading-6">
          {task.title}
        </h2>
        {locale === "vi" && task.titleVi ? (
          <p className="mt-2 break-words text-sm italic leading-6 text-sky-600 dark:text-sky-400">
            {task.titleVi}
          </p>
        ) : null}
      </div>
      <div className="border-t p-3">
        <Link
          href={`/toeic/writing/part-2/${task.id}`}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
