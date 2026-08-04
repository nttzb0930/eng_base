"use client";

import { ArrowRight, BookOpenText, Clock3, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { GeneralEnglishSectionNav } from "@/app/features/general-english/components/GeneralEnglishSectionNav";
import { useReadingPassages } from "@/app/features/reading/hooks/use-reading";

export function ReadingListView() {
  const t = useTranslations("reading");
  const passagesQuery = useReadingPassages("A1");
  const passages = passagesQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <GeneralEnglishSectionNav active="reading" />

      <header className="max-w-3xl border-b border-slate-200 pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">
          {t("list.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {t("list.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          {t("list.description")}
        </p>
      </header>

      {passagesQuery.isLoading ? (
        <div
          role="status"
          aria-label={t("loading")}
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : passagesQuery.isError ? (
        <section className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h2 className="font-bold text-rose-900">{t("error.title")}</h2>
          <p className="mt-1 text-sm text-rose-700">{t("error.description")}</p>
          <Button
            type="button"
            onClick={() => passagesQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      ) : passages.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <BookOpenText
            className="mx-auto h-9 w-9 text-slate-300"
            aria-hidden="true"
          />
          <h2 className="mt-4 font-bold text-slate-900">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("empty.description")}
          </p>
        </section>
      ) : (
        <section
          aria-label={t("list.results")}
          className="mt-8 grid gap-4 md:grid-cols-2"
        >
          {passages.map((passage) => (
            <article
              key={passage.id}
              className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-sky-300"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                  {passage.cefrLevel}
                </span>
                {passage.latestAttempt ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {t("list.latestAccuracy", {
                      accuracy: passage.latestAttempt.accuracy,
                    })}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
                {passage.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                <span>{passage.topicTitle ?? t("list.noTopic")}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("list.minutes", { count: passage.estimatedMinutes })}
                </span>
                <span>
                  {t("list.questions", { count: passage.questionCount })}
                </span>
              </div>
              <Link
                href={`/reading/${encodeURIComponent(passage.slug)}`}
                className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4"
              >
                {passage.latestAttempt ? t("list.readAgain") : t("list.start")}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
