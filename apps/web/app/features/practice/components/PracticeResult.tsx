"use client";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { withLocale } from "@/app/i18n/paths";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

type PracticeResultProps = {
  title: string;
  correctCount: number;
  wrongCount: number;
  mapHref: string;
  retryLabel?: string;
  onRetry: () => void;
  nextLessonHref?: string;
  reviewedItems?: PracticeResultItem[];
};

export type PracticeResultItem = {
  vocabularyItemId: number;
  word: string;
  meaning: string;
  cefrLevel: string;
  correct: boolean;
  challengeType: string;
  answer?: string;
};

export const PracticeResult = ({
  title,
  correctCount,
  wrongCount,
  mapHref,
  retryLabel,
  onRetry,
  nextLessonHref,
  reviewedItems = [],
}: PracticeResultProps) => {
  const t = useTranslations("practice");
  const totalCount = correctCount + wrongCount;
  const accuracy =
    totalCount === 0 ? 100 : Math.round((correctCount / totalCount) * 100);
  const earnedXp = correctCount * 10;
  const uniqueWordCount = new Set(
    reviewedItems.map((item) => item.vocabularyItemId)
  ).size;
  const weakWords = Array.from(
    new Map(
      reviewedItems
        .filter((item) => !item.correct)
        .map((item) => [item.vocabularyItemId, item])
    ).values()
  );
  const perfect = wrongCount === 0;
  const continueHref = nextLessonHref ?? mapHref;

  const stats = [
    {
      label: t("accuracy"),
      value: `${accuracy}%`,
      Icon: Target,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: t("correct"),
      value: correctCount,
      Icon: Award,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: t("wrong"),
      value: wrongCount,
      Icon: XCircle,
      tone: "bg-rose-50 text-rose-600",
    },
    {
      label: t("sessionReview"),
      value: uniqueWordCount,
      Icon: BookOpenCheck,
      tone: "bg-violet-50 text-violet-600",
    },
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-2 py-4 text-center sm:px-4 sm:py-6 lg:py-8">
      <section>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary ring-4 ring-primary/15" />
          {t("complete")}
        </span>

        <div className="relative mx-auto mt-5 h-44 w-44 sm:h-52 sm:w-52">
          <span className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-[spin_28s_linear_infinite]" />
          <span className="absolute inset-[18px] rounded-full border border-primary/20 motion-safe:animate-[spin_36s_linear_infinite_reverse]" />
          <span className="absolute inset-9 rounded-full border border-dashed border-primary/30 motion-safe:animate-[spin_22s_linear_infinite]" />
          <span className="absolute inset-[52px] flex items-center justify-center rounded-full bg-primary shadow-[0_20px_40px_-18px_rgba(31,186,117,0.7)]">
            <span
              className="text-6xl drop-shadow-md motion-safe:animate-[bounce_2.4s_ease-in-out_infinite]"
              aria-hidden="true"
            >
              🎉
            </span>
          </span>
          <span className="absolute -left-4 top-4 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
            {perfect ? "100%" : `${accuracy}%`}
          </span>
          <span className="absolute -right-5 top-14 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
            +{earnedXp} {t("xpUnit")}
          </span>
          <span className="absolute -left-2 bottom-7 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
            {correctCount}/{totalCount}
          </span>
        </div>

        <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {t("sessionReviewDescription", { count: uniqueWordCount })}
        </p>
      </section>

      <section className="mx-auto mt-7 inline-flex items-center gap-4 rounded-2xl border border-primary/15 bg-card px-6 py-4 shadow-[0_14px_32px_-24px_rgba(31,186,117,0.8)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Zap className="h-6 w-6 fill-current" />
        </span>
        <div className="text-left">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t("xpEarned")}
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums">
            {earnedXp}{" "}
            <span className="text-sm font-semibold text-muted-foreground">
              {t("xpUnit")}
            </span>
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 text-left lg:grid-cols-4">
        {stats.map(({ label, value, Icon, tone }) => (
          <article key={label} className="rounded-2xl border bg-card p-4 sm:p-5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-3 grid gap-3 text-left lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${perfect
                  ? "bg-amber-100 text-amber-600"
                  : "bg-rose-50 text-rose-600"
                }`}
            >
              {perfect ? (
                <Award className="h-7 w-7" />
              ) : (
                <Target className="h-7 w-7" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-xs font-bold uppercase tracking-[0.12em] ${perfect ? "text-amber-700" : "text-rose-600"
                  }`}
              >
                {perfect ? t("wordsRemembered") : t("wordsToReview")}
              </p>
              <h2 className="mt-1 text-lg font-black">
                {perfect
                  ? `${correctCount}/${totalCount} ${t("correct").toLocaleLowerCase()}`
                  : `${weakWords.length} ${t("wordsToReview").toLocaleLowerCase()}`}
              </h2>
              {weakWords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {weakWords.slice(0, 8).map((item) => (
                    <span
                      key={item.vocabularyItemId}
                      className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600"
                    >
                      {item.word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        <Link
          href={withLocale(continueHref)}
          className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              {nextLessonHref ? t("continue") : t("backToMap")}
            </span>
            <span className="mt-1 block text-lg font-black">
              {nextLessonHref ? t("continue") : t("backToPracticeMap")}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" />
        </Link>
      </section>

      <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
        <Button
          variant="default"
          size="lg"
          className="sm:min-w-48"
          onClick={onRetry}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {retryLabel ?? t("practiceAgain")}
        </Button>
        <Button asChild variant="secondary" size="lg" className="sm:min-w-48">
          <Link href={withLocale(continueHref)}>
            {nextLessonHref ? t("continue") : t("backToMap")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
