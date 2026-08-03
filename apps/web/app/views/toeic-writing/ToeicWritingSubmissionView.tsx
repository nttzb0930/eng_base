"use client";

import { ArrowLeft, FilePenLine, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ToeicWritingReferencePanel } from "@/app/features/toeic-writing/components/ToeicWritingReferencePanel";
import { ToeicWritingResultSkeleton } from "@/app/features/toeic-writing/components/ToeicWritingResultSkeleton";
import { useToeicWritingSubmission } from "@/app/features/toeic-writing/hooks/use-toeic-writing";

type ToeicWritingSubmissionViewProps = {
  submissionId: number;
};

export function ToeicWritingSubmissionView({
  submissionId,
}: ToeicWritingSubmissionViewProps) {
  const t = useTranslations("toeicWriting.result");
  const locale = useLocale();
  const submissionQuery = useToeicWritingSubmission(submissionId);

  if (submissionQuery.isLoading) return <ToeicWritingResultSkeleton />;

  if (submissionQuery.isError || !submissionQuery.data) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <section className="bg-card rounded-md border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("loadErrorTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("loadErrorDescription")}
          </p>
          <Button
            type="button"
            onClick={() => void submissionQuery.refetch()}
            className="mt-5 gap-2 rounded-md"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("retry")}
          </Button>
        </section>
      </main>
    );
  }

  const submission = submissionQuery.data;
  const submittedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(submission.submittedAt));

  return (
    <main className="min-h-dvh bg-slate-50/70 dark:bg-slate-950/30">
      <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
        <Link
          href="/learn/cert/toeic/writing"
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("backToWriting")}
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{t("submitted")}</Badge>
            <Badge variant="outline">
              {t("part", { part: submission.part })}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {submission.taskTitle}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("submittedAt", { date: submittedAt })}
          </p>
        </header>

        <div className="mt-7 grid items-start gap-5 lg:grid-cols-2">
          <section className="bg-card rounded-md border p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <FilePenLine
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">{t("learnerResponse")}</h2>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7">
              {submission.responseText}
            </p>
          </section>

          <ToeicWritingReferencePanel submission={submission} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary" className="rounded-md">
            <Link
              href={`/toeic/writing/part-${submission.part}/${submission.taskId}`}
            >
              {t("startAgain")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md">
            <Link href="/learn/cert/toeic/writing">{t("backToWriting")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
