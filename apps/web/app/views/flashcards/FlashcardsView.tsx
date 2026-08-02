"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bookmark,
  Brain,
  Calendar,
  CalendarClock,
  ChevronRight,
  Layers,
  ListFilter,
  Lock,
  Play,
  Tag,
  Target,
} from "lucide-react";
import type { FlashcardDeckSummary } from "@repo/shared";

import { FlashcardsPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useFlashcardSummary } from "@/app/features/flashcards/hooks/use-flashcards";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useTopics } from "@/app/features/topics/hooks/use-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type DeckTab = "cefr" | "topic";

const getDeckProgress = (deck: FlashcardDeckSummary) =>
  deck.total > 0 ? Math.round((deck.learned / deck.total) * 100) : 0;

export function FlashcardsView() {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const summaryQuery = useFlashcardSummary();
  const topicsQuery = useTopics(locale);
  const [activeTab, setActiveTab] = useState<DeckTab>("cefr");

  const userProgress = userProgressQuery.data;
  const summary = summaryQuery.data;
  const isLoading =
    userProgressQuery.isLoading ||
    summaryQuery.isLoading ||
    topicsQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse || !summary) {
    return <FlashcardsPageSkeleton />;
  }

  const dueCount = summary.overview.due;
  const savedCount = summary.overview.saved;
  const weakCount = summary.overview.weak;
  const accuracy =
    summary.overview.accuracy === null
      ? t("notAvailable")
      : `${summary.overview.accuracy}%`;

  return (
    <FeedWrapper>
      <div className="pb-12">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              {t("description")}
            </p>
          </div>
          <Link
            href={withLocale("/flashcards/session?deck=due")}
            className="border-border/80 bg-card text-foreground shadow-xs hover:bg-muted inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-colors"
          >
            {t("dueReview")}
          </Link>
        </header>

        <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<CalendarClock className="h-6 w-6" />}
            value={dueCount}
            title={t("dueToday")}
            description={t("dueMetricDescription")}
            tone="rose"
          />
          <MetricCard
            icon={<Bookmark className="h-6 w-6" />}
            value={savedCount}
            title={t("savedWords")}
            description={t("savedMetricDescription")}
            tone="sky"
          />
          <MetricCard
            icon={<Brain className="h-6 w-6" />}
            value={weakCount}
            title={t("weakWords")}
            description={t("weakMetricDescription")}
            tone="orange"
          />
          <MetricCard
            icon={<Target className="h-6 w-6" />}
            value={accuracy}
            title={t("accuracy")}
            description={t("accuracyDescription")}
            tone="emerald"
          />
        </section>

        <section className="relative mb-9 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-6 text-white shadow-xl sm:p-8 dark:from-emerald-900 dark:via-emerald-950 dark:to-emerald-900">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <span className="inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {t("today")}
              </span>
              <h2 className="mb-2 mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {t("dueHeroTitle", { count: dueCount })}
              </h2>
              <p className="mb-6 max-w-xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
                {t("dueHeroDescription")}
              </p>
              <div className="grid max-w-md grid-cols-3 gap-3">
                <HeroStat value={savedCount} label={t("savedShort")} />
                <HeroStat value={weakCount} label={t("weakShort")} />
                <HeroStat value={accuracy} label={t("accuracyShort")} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start justify-center md:items-end">
              <Link
                href={withLocale("/flashcards/session?deck=due")}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-emerald-50 hover:shadow-xl active:scale-95"
              >
                <Play className="h-4 w-4 fill-emerald-700 text-emerald-700" />
                {t("dueReview")}
              </Link>
              <p className="mt-2.5 text-xs font-medium text-emerald-100/90">
                {t("dueSessionMeta", { count: dueCount })}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              {t("quickReviewTitle")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("quickReviewDescription")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewDeckCard
              href="/flashcards/session?deck=saved"
              icon={<Bookmark className="h-5 w-5" />}
              count={savedCount}
              title={t("savedReviewTitle")}
              description={t("savedWordsDescription")}
              badge={t("wordCount", { count: savedCount })}
              tone="sky"
              action={t("reviewNow")}
            />
            <ReviewDeckCard
              href="/flashcards/session?deck=weak"
              icon={<Brain className="h-5 w-5" />}
              count={weakCount}
              title={t("weakReviewTitle")}
              description={t("weakWordsDescription")}
              badge={t("needsReview")}
              tone="orange"
              action={t("reviewNow")}
            />
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                {t("chooseDeckTitle")}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("chooseDeckDescription")}
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <DeckTabButton
              active={activeTab === "cefr"}
              count={summary.cefrDecks.length}
              icon={<Layers className="h-3.5 w-3.5" />}
              label={t("tabs.cefr")}
              onClick={() => setActiveTab("cefr")}
            />
            <DeckTabButton
              active={activeTab === "topic"}
              count={summary.topicDecks.length}
              icon={<Tag className="h-3.5 w-3.5" />}
              label={t("tabs.topic")}
              onClick={() => setActiveTab("topic")}
            />
          </div>

          <p className="text-muted-foreground mb-5 text-xs">
            {t("certificateUnavailable")}
          </p>

          {activeTab === "cefr" && (
            <div className="animate-page-enter grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summary.cefrDecks.map((deck) => {
                const percent = getDeckProgress(deck);
                return (
                  <DeckCard
                    key={deck.key}
                    href={`/flashcards/session?deck=${deck.key}`}
                    locked={!deck.available}
                    marker={deck.key}
                    title={t(`levels.${deck.key}.title`)}
                    description={t(`levels.${deck.key}.description`)}
                    meta={t("deckProgress", {
                      learned: deck.learned,
                      total: deck.total,
                      mastered: deck.mastered,
                    })}
                    percent={percent}
                    badge={
                      deck.accuracy === null
                        ? t("notAvailable")
                        : t("accuracyValue", { accuracy: deck.accuracy })
                    }
                    action={
                      deck.learned > 0 ? t("continueReview") : t("startReview")
                    }
                    lockedLabel={t("locked")}
                  />
                );
              })}
            </div>
          )}

          {activeTab === "topic" && (
            <div className="animate-page-enter grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summary.topicDecks.map((deck) => {
                const topic = topicsQuery.data?.find(
                  (item) => item.slug === deck.key
                );

                return (
                  <DeckCard
                    key={deck.key}
                    href={`/flashcards/session?source=topic&slug=${encodeURIComponent(deck.key)}`}
                    locked={!deck.available}
                    marker={<Tag className="h-5 w-5" />}
                    title={topic?.title ?? deck.key}
                    description={topic?.description ?? t("topicDescription")}
                    meta={t("deckProgress", {
                      learned: deck.learned,
                      total: deck.total,
                      mastered: deck.mastered,
                    })}
                    percent={getDeckProgress(deck)}
                    badge={
                      deck.accuracy === null
                        ? t("notAvailable")
                        : t("accuracyValue", { accuracy: deck.accuracy })
                    }
                    action={
                      deck.learned > 0 ? t("continueReview") : t("startReview")
                    }
                    lockedLabel={t("locked")}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </FeedWrapper>
  );
}

function MetricCard({
  icon,
  value,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  value: number | string;
  title: string;
  description: string;
  tone: "rose" | "sky" | "orange" | "emerald";
}) {
  const toneClass = {
    rose: "text-rose-600 bg-rose-50 border-rose-200 hover:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800",
    sky: "text-sky-600 bg-sky-50 border-sky-200 hover:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800",
    orange:
      "text-orange-600 bg-orange-50 border-orange-200 hover:border-orange-500/40 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
    emerald:
      "text-emerald-600 bg-emerald-50 border-emerald-200 hover:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  }[tone];

  return (
    <div className="border-border/80 bg-card shadow-xs group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "shadow-xs flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
            toneClass
          )}
        >
          {icon}
        </div>
        <div className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {value}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-md">
      <div className="text-xl font-semibold text-white sm:text-2xl">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/80">
        {label}
      </div>
    </div>
  );
}

function ReviewDeckCard({
  href,
  icon,
  count,
  title,
  description,
  badge,
  tone,
  action,
}: {
  href: string;
  icon: ReactNode;
  count: number;
  title: string;
  description: string;
  badge: string;
  tone: "sky" | "orange";
  action: string;
}) {
  const toneClass =
    tone === "sky"
      ? "from-sky-400 to-sky-600 text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800"
      : "from-orange-400 to-orange-600 text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800";

  return (
    <article className="border-border/80 bg-card shadow-xs group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:shadow-md">
      <div
        className={cn(
          "absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r",
          toneClass
        )}
      />
      <div>
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "shadow-xs flex h-11 w-11 items-center justify-center rounded-xl border",
              toneClass
            )}
          >
            {icon}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              toneClass
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {badge}
          </span>
        </div>
        <h4 className="text-foreground mt-4 text-base font-semibold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {title}
        </h4>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
          {description}
        </p>
        <div className="border-border/70 mt-4 flex items-center justify-between border-t border-dashed pt-3 text-xs">
          <div>
            <div className="text-foreground font-semibold">{count}</div>
            <div className="text-muted-foreground text-[11px]">{title}</div>
          </div>
          <Link
            href={withLocale("/saved-words")}
            className="border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-10 w-10 items-center justify-center rounded-xl border transition-colors"
            title={title}
          >
            <ListFilter className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <Link
        href={withLocale(href)}
        className={cn(
          "shadow-xs mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-white transition-colors",
          tone === "sky"
            ? "bg-sky-600 hover:bg-sky-700"
            : "bg-orange-600 hover:bg-orange-700"
        )}
      >
        {action}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function DeckTabButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
        active
          ? "shadow-xs border-emerald-600 bg-emerald-600 text-white"
          : "border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "py-0.2 rounded-full px-1.5 text-[10px]",
          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function DeckCard({
  href,
  locked,
  marker,
  title,
  description,
  meta,
  percent,
  action,
  lockedLabel,
  badge,
}: {
  href: string;
  locked: boolean;
  marker: ReactNode;
  title: string;
  description: string;
  meta: string;
  percent: number;
  action: string;
  lockedLabel: string;
  badge?: string;
}) {
  return (
    <Link
      href={locked ? "#" : withLocale(href)}
      className={cn(
        "group relative flex min-h-[165px] flex-col justify-between rounded-2xl border p-5 transition-all duration-200",
        locked
          ? "border-border/50 bg-muted/20 pointer-events-none opacity-60"
          : "border-border/80 bg-card cursor-pointer hover:border-emerald-500/40 hover:shadow-md"
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="shadow-xs flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
            {marker}
          </div>
          {locked ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
              <Lock className="h-3.5 w-3.5" />
              {badge ?? lockedLabel}
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/60">
              {badge ?? `${percent}%`}
            </span>
          )}
        </div>
        <h4 className="text-foreground mt-3.5 text-base font-semibold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {title}
        </h4>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-4">
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
          <span className="text-emerald-600 dark:text-emerald-400">{meta}</span>
          <span className="text-muted-foreground inline-flex items-center gap-0.5 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            {action}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
