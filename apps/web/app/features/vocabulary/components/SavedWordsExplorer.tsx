"use client";

import type { SavedVocabularyWord } from "@repo/shared/vocabulary";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

import { useToggleSavedWord } from "../hooks/use-vocabulary";
import { getVocabularyReviewStatus } from "../vocabulary-review-status";
import { VocabularyAudioButton } from "./VocabularyAudioButton";

type SavedWordsExplorerProps = {
  initialWords: SavedVocabularyWord[];
};

type Filter = "all" | "A1" | "A2" | "B1" | "B2" | "due" | "mastered";
type Sort = "newest" | "oldest" | "alphabetical" | "due";

const PAGE_SIZE = 6;

export function SavedWordsExplorer({ initialWords }: SavedWordsExplorerProps) {
  const t = useTranslations("savedWords");
  const vocabularyT = useTranslations("vocabulary");
  const locale = useLocale();
  const [words, setWords] = useState(initialWords);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const toggleSavedWord = useToggleSavedWord();

  const stats = useMemo(
    () =>
      words.reduce(
        (result, savedWord) => {
          const status = getVocabularyReviewStatus(savedWord.vocabularyItem);
          result.total += 1;
          if (status.due) result.due += 1;
          if (status.masteryLevel === "learning") result.learning += 1;
          if (status.masteryLevel === "review") result.review += 1;
          if (status.masteryLevel === "mastered") result.mastered += 1;
          return result;
        },
        { total: 0, due: 0, learning: 0, review: 0, mastered: 0 }
      ),
    [words]
  );

  const filteredWords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const result = words.filter((savedWord) => {
      const item = savedWord.vocabularyItem;
      const status = getVocabularyReviewStatus(item);
      const matchesFilter =
        filter === "all" ||
        (filter === "due" && status.due) ||
        (filter === "mastered" && status.masteryLevel === "mastered") ||
        item.cefrLevel === filter;
      const searchable = [
        item.word,
        item.phonetic,
        item.primaryMeaningVi,
        item.meaningVi,
        item.exampleEn,
        item.exampleVi,
        ...item.vocabularyExamples.flatMap((example) => [
          example.exampleEn,
          example.exampleVi,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(locale);

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });

    return result.sort((a, b) => {
      if (sort === "alphabetical") {
        return a.vocabularyItem.word.localeCompare(b.vocabularyItem.word, locale);
      }
      if (sort === "due") {
        const aDue = getVocabularyReviewStatus(a.vocabularyItem).due ? 1 : 0;
        const bDue = getVocabularyReviewStatus(b.vocabularyItem).due ? 1 : 0;
        if (aDue !== bDue) return bDue - aDue;
      }
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [filter, locale, query, sort, words]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageWords = filteredWords.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const firstResult = filteredWords.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(safePage * PAGE_SIZE, filteredWords.length);

  const chooseFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  const removeWord = (savedWord: SavedVocabularyWord) => {
    setRemovingId(savedWord.id);
    startTransition(() => {
      void toggleSavedWord.mutateAsync(savedWord.vocabularyItem.id)
        .then((response) => {
          if (response.saved) throw new Error("Word remained saved");
          setWords((current) => current.filter((word) => word.id !== savedWord.id));
          toast.success(t("removeSuccess", { word: savedWord.vocabularyItem.word }));
        })
        .catch(() => toast.error(t("removeError")))
        .finally(() => setRemovingId(null));
    });
  };

  const statItems = [
    ["saved", stats.total, Bookmark, "bg-rose-50 text-rose-500"],
    ["due", stats.due, Clock3, "bg-amber-50 text-amber-600"],
    ["learning", stats.learning, Clock3, "bg-sky-50 text-sky-600"],
    ["review", stats.review, Clock3, "bg-orange-50 text-orange-600"],
    ["mastered", stats.mastered, Check, "bg-emerald-50 text-emerald-600"],
  ] as const;

  const filters: Filter[] = ["all", "A1", "A2", "B1", "B2", "due", "mastered"];

  return (
    <div className="mt-6">
      <section aria-label={t("statsLabel")} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statItems.map(([key, value, Icon, tone]) => (
          <div key={key} className="surface-panel flex items-center gap-3 p-4">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-xl font-black tabular-nums">{value}</strong>
              <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                {t(`stats.${key}`)}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="surface-panel mt-6 p-3" aria-label={t("filtersLabel")}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t("searchLabel")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-xl border border-transparent bg-muted/70 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            {filters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  filter === value
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {t(`filters.${value}`)}
              </button>
            ))}
          </div>

          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
            {t("sortLabel")}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as Sort);
                setPage(1);
              }}
              className="h-10 rounded-xl border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">{t("sort.newest")}</option>
              <option value="oldest">{t("sort.oldest")}</option>
              <option value="alphabetical">{t("sort.alphabetical")}</option>
              <option value="due">{t("sort.due")}</option>
            </select>
          </label>
        </div>
      </section>

      {pageWords.length > 0 ? (
        <section className="mt-4 space-y-3" aria-label={t("wordListLabel")}>
          {pageWords.map((savedWord) => {
            const item = savedWord.vocabularyItem;
            const status = getVocabularyReviewStatus(item);
            const progress = item.userVocabularyProgress[0];
            const example = item.vocabularyExamples[0]?.exampleEn ?? item.exampleEn;
            const mastery = status.masteryLevel as "new" | "learning" | "review" | "mastered";

            return (
              <article
                key={savedWord.id}
                className="group flex flex-col gap-4 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_12px_28px_-24px_rgba(6,78,59,0.65)] sm:flex-row sm:items-center"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                  {item.cefrLevel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-foreground">{item.word}</h2>
                    {item.phonetic && (
                      <span className="text-xs font-medium text-muted-foreground">{item.phonetic}</span>
                    )}
                    <span className="rounded-md bg-muted px-2 py-1 text-[0.68rem] font-bold uppercase text-muted-foreground">
                      {item.pos}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[0.68rem] font-bold",
                        status.due
                          ? "bg-amber-50 text-amber-700"
                          : mastery === "mastered"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-sky-50 text-sky-700"
                      )}
                    >
                      {status.due ? vocabularyT("due") : vocabularyT(`mastery.${mastery}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{item.primaryMeaningVi}</p>
                  {example && (
                    <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">“{example}”</p>
                  )}
                  <p className="mt-2 text-[0.7rem] font-medium text-muted-foreground">
                    {progress
                      ? t("reviewMeta", {
                          correct: progress.correctCount,
                          wrong: progress.wrongCount,
                        })
                      : t("notReviewed")}
                    <span aria-hidden="true"> · </span>
                    {t("savedOn", {
                      date: new Date(savedWord.createdAt).toLocaleDateString(locale),
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1 border-t pt-3 sm:border-0 sm:pt-0">
                  {item.audioUrl && (
                    <VocabularyAudioButton audioUrl={item.audioUrl} label={item.word} />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending && removingId === savedWord.id}
                    onClick={() => removeWord(savedWord)}
                    aria-label={t("removeWord", { word: item.word })}
                    title={t("removeWord", { word: item.word })}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-dashed p-10 text-center">
          <Search className="mx-auto h-7 w-7 text-muted-foreground" />
          <h2 className="mt-4 font-black">{t("noResultsTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("noResultsDescription")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setPage(1);
            }}
          >
            {t("clearFilters")}
          </Button>
        </section>
      )}

      {filteredWords.length > 0 && (
        <nav className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label={t("paginationLabel")}>
          <p className="text-xs font-medium text-muted-foreground">
            {t("resultRange", { from: firstResult, to: lastResult, total: filteredWords.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-9 w-9 rounded-lg"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label={t("previousPage")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-sm font-bold tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="h-9 w-9 rounded-lg"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              aria-label={t("nextPage")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
