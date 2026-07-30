"use client";

import { useState } from "react";
import { ArrowLeft, Clock3, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import {
  ReadingPreferences,
  useReadingPreferences,
} from "@/app/features/reading/components/ReadingPreferences";
import { ReadingQuestion } from "@/app/features/reading/components/ReadingQuestion";
import {
  useReadingPassage,
  useSubmitReadingAttempt,
} from "@/app/features/reading/hooks/use-reading";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type ReadingSessionViewProps = {
  slug: string;
};

export function ReadingSessionView({ slug }: ReadingSessionViewProps) {
  const t = useTranslations("reading");
  const router = useRouter();
  const locale = useCurrentLocale();
  const passageQuery = useReadingPassage(slug);
  const passageId = passageQuery.data?.id ?? 0;
  const submitMutation = useSubmitReadingAttempt(passageId);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [preferences, setPreferences] = useReadingPreferences();

  if (passageQuery.isLoading) {
    return (
      <div
        role="status"
        aria-label={t("loading")}
        className="flex min-h-dvh items-center justify-center"
      >
        <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
      </div>
    );
  }

  if (passageQuery.isError || !passageQuery.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center">
          <h1 className="font-bold text-slate-950">{t("error.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("session.notAvailable")}
          </p>
          <Button
            type="button"
            onClick={() => passageQuery.refetch()}
            className="mt-5"
          >
            {t("error.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const passage = passageQuery.data;
  const complete = Object.keys(answers).length === passage.questions.length;

  async function submit() {
    if (!complete) return;
    try {
      const result = await submitMutation.mutateAsync({
        submissionKey,
        answers: passage.questions.map((question) => ({
          questionId: question.id,
          optionId: answers[question.id],
        })),
      });
      router.push(withLocale(`/reading/results/${result.id}`, locale));
    } catch {
      // The visible mutation error below keeps the form and stable key retryable.
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/reading"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("session.back")}
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {t("list.minutes", { count: passage.estimatedMinutes })}
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div>
          <article
            className={cn(
              "rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 sm:p-9",
              preferences.fontScale === "normal" && "text-base",
              preferences.fontScale === "large" && "text-lg",
              preferences.fontScale === "extra-large" && "text-xl",
              preferences.lineHeight === "comfortable" && "leading-8",
              preferences.lineHeight === "relaxed" && "leading-10"
            )}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
              {passage.cefrLevel}
              {passage.topicTitle ? ` · ${passage.topicTitle}` : ""}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-950">
              {passage.title}
            </h1>
            <div className="mt-7 whitespace-pre-line">{passage.body}</div>
          </article>

          <section
            aria-labelledby="reading-questions-title"
            className="mt-8 space-y-5"
          >
            <div>
              <h2
                id="reading-questions-title"
                className="text-xl font-bold text-slate-950"
              >
                {t("session.questionsTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("session.progress", {
                  answered: Object.keys(answers).length,
                  total: passage.questions.length,
                })}
              </p>
            </div>
            {passage.questions.map((question, index) => (
              <ReadingQuestion
                key={question.id}
                question={question}
                index={index}
                selectedOptionId={answers[question.id]}
                onSelect={(optionId) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: optionId,
                  }))
                }
              />
            ))}
          </section>

          {submitMutation.isError ? (
            <p role="alert" className="mt-5 text-sm font-medium text-rose-600">
              {t("session.submitError")}
            </p>
          ) : null}
          <div className="mt-7 flex justify-end border-t border-slate-200 pt-6">
            <Button
              type="button"
              variant="primary"
              disabled={!complete || submitMutation.isPending}
              onClick={submit}
              className="min-w-40"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("session.submit")
              )}
            </Button>
          </div>
        </div>

        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-6">
            <ReadingPreferences value={preferences} onChange={setPreferences} />
          </div>
        </div>
      </div>
    </main>
  );
}
