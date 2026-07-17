"use client";

import { BookmarkCheck, CalendarClock, Layers3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { SavedWordsExplorer } from "@/app/features/vocabulary/components/SavedWordsExplorer";
import { useSavedWords } from "@/app/features/vocabulary/hooks/use-vocabulary";
import { withLocale } from "@/app/i18n/paths";
export function SavedWordsView() {
  const t = useTranslations("savedWords");
  const savedWordsQuery = useSavedWords();

  if (savedWordsQuery.isLoading) {
    return <ListPageSkeleton />;
  }

  const savedWords = savedWordsQuery.data ?? [];
  const hasWords = savedWords.length > 0;

  return (
    <div className="pb-12">
      <header className="mb-7 max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          {t("description")}
        </p>
      </header>

      {hasWords && (
        <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)),#047857_58%,#064e3b)] p-6 text-white shadow-[0_18px_48px_-30px_rgba(6,78,59,0.8)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
                  {t("quickReviewEyebrow", { count: savedWords.length })}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {t("quickReviewTitle")}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-emerald-50/80">
                {t("quickReviewDescription")}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Link
                href={withLocale("/saved-words/review?mode=due")}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">{t("reviewDueShort")}</span>
                  <span className="mt-1 block text-xs leading-5 text-emerald-50/75">
                    {t("reviewDueDescription")}
                  </span>
                </span>
              </Link>
              <Link
                href={withLocale("/saved-words/review?mode=all")}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <BookmarkCheck className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">{t("reviewAllShort")}</span>
                  <span className="mt-1 block text-xs leading-5 text-emerald-50/75">
                    {t("reviewAllDescription")}
                  </span>
                </span>
              </Link>
              <Link
                href={withLocale("/flashcards/session?deck=saved")}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Layers3 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">{t("flashcards")}</span>
                  <span className="mt-1 block text-xs leading-5 text-emerald-50/75">
                    {t("flashcardsDescription")}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {hasWords ? (
        <SavedWordsExplorer initialWords={savedWords} />
      ) : (
        <section className="surface-panel mt-6 flex flex-col items-center border-dashed px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookmarkCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-black">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href={withLocale("/learn")}>{t("startLearning")}</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
