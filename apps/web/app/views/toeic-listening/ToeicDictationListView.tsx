"use client";

import { ArrowLeft, ArrowRight, Keyboard, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { ToeicBrowseContainer } from "@/app/features/toeic/components/ToeicBrowseContainer";
import { ToeicListeningModeTabs } from "@/app/features/toeic-listening/components/ToeicListeningModeTabs";
import { ToeicDictationListSkeleton } from "@/app/features/toeic-dictation/components/ToeicDictationListSkeleton";
import { useToeicDictationSets } from "@/app/features/toeic-dictation/hooks/use-toeic-dictation";
import type { ToeicDictationPart } from "@repo/shared";

const parts: Array<ToeicDictationPart | "all"> = ["all", 1, 2, 3, 4];

export function ToeicDictationListView() {
  const t = useTranslations("toeicDictation");
  const [test, setTest] = useState<number | undefined>();
  const [part, setPart] = useState<ToeicDictationPart | undefined>();
  const dictationQuery = useToeicDictationSets();

  const items = useMemo(() => {
    if (!dictationQuery.data) return [];
    return dictationQuery.data.filter((item) => {
      const matchPart = part === undefined || item.part === part;
      const matchTest = test === undefined || item.testNumber === test;
      return matchPart && matchTest;
    });
  }, [dictationQuery.data, part, test]);

  if (dictationQuery.isLoading) return <ToeicDictationListSkeleton />;
  if (dictationQuery.isError || !dictationQuery.data) {
    return (
      <FeedWrapper>
        <section className="bg-card mx-auto max-w-lg rounded-2xl border border-rose-200 p-7 text-center dark:border-rose-900">
          <h1 className="text-lg font-semibold">{t("error.title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("error.description")}
          </p>
          <Button
            type="button"
            onClick={() => dictationQuery.refetch()}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("error.retry")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }

  return (
    <FeedWrapper>
      <ToeicBrowseContainer>
        <Link
          href="/learn/cert/toeic/listening"
          className="text-muted-foreground inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("back")}
        </Link>
        <header className="mt-7 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {t("description")}
          </p>
        </header>
        <div className="mt-6 space-y-4">
          <ToeicListeningModeTabs mode="dictation" />

          <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto">
            <Select
              value={part ? String(part) : "all"}
              onValueChange={(val) =>
                setPart(val === "all" ? undefined : (Number(val) as ToeicDictationPart))
              }
            >
              <SelectTrigger className="w-full rounded-xl border-emerald-200/80 bg-card font-semibold text-emerald-800 sm:w-[180px] dark:border-emerald-900 dark:text-emerald-300">
                <SelectValue placeholder={t("allParts")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allParts")}</SelectItem>
                <SelectItem value="1">{t("part", { part: 1 })}</SelectItem>
                <SelectItem value="2">{t("part", { part: 2 })}</SelectItem>
                <SelectItem value="3">{t("part", { part: 3 })}</SelectItem>
                <SelectItem value="4">{t("part", { part: 4 })}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={test ? String(test) : "all"}
              onValueChange={(val) =>
                setTest(val === "all" ? undefined : Number(val))
              }
            >
              <SelectTrigger className="w-full rounded-xl border-border bg-card font-semibold text-foreground sm:w-[160px]">
                <SelectValue placeholder={t("allTests")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTests")}</SelectItem>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                  <SelectItem key={val} value={String(val)}>
                    {t("test", { test: val })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed px-6 py-12 text-center">
            <Keyboard className="text-muted-foreground mx-auto h-8 w-8" />
            <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {t("empty.description")}
            </p>
          </section>
        ) : (
          <section
            className="mt-8 grid gap-5 md:grid-cols-2"
            aria-label={t("availableSets")}
          >
            {items.map((item) => {
              const answered = item.progress.answeredCount;
              const percent = item.itemCount
                ? Math.min(100, (answered / item.itemCount) * 100)
                : 0;
              return (
                <article
                  key={item.id}
                  className="bg-card flex flex-col rounded-2xl border p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {t("part", { part: item.part })}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {t("test", { test: item.testNumber })}
                      </h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {t("questionCount", { count: item.itemCount })}
                    </span>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      {t("progress")}
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {answered}/{item.itemCount}
                    </span>
                  </div>
                  <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-[width]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                    <span className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ {item.progress.masteredCount}
                    </span>
                    <span className="rounded-xl bg-rose-50 px-2 py-2 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      × {Math.max(0, answered - item.progress.masteredCount)}
                    </span>
                    <span className="bg-muted rounded-xl px-2 py-2">
                      ○ {Math.max(0, item.itemCount - answered)}
                    </span>
                  </div>
                  <Link
                    href={`/toeic/dictation/sets/${item.id}`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {answered ? t("continue") : t("start")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </ToeicBrowseContainer>
    </FeedWrapper>
  );
}
