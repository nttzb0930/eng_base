"use client";

import type { PracticeResultItem } from "@/app/features/practice/components/PracticeResult";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Clock3,
  Heart,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";

type LessonCompleteProps = {
  lessonId: number;
  lessonTitle: string;
  nextLesson: { id: number; title: string } | null;
  hearts: number;
  correctCount: number;
  wrongCount: number;
  earnedXp: number;
  durationSeconds: number;
  reviewedItems: PracticeResultItem[];
  width: number;
  height: number;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

export function LessonComplete({
  lessonId,
  lessonTitle,
  nextLesson,
  hearts,
  correctCount,
  wrongCount,
  earnedXp,
  durationSeconds,
  reviewedItems,
  width,
  height,
}: LessonCompleteProps) {
  const t = useTranslations("lessonComplete");
  const totalAttempts = correctCount + wrongCount;
  const accuracy =
    totalAttempts === 0 ? 100 : Math.round((correctCount / totalAttempts) * 100);
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
  const continueHref = nextLesson ? `/lesson/${nextLesson.id}` : "/learn";

  const stats = [
    {
      label: t("accuracy"),
      value: `${accuracy}%`,
      detail: t("accuracyDetail", { correct: correctCount, total: totalAttempts }),
      Icon: Target,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: t("time"),
      value: formatDuration(durationSeconds),
      detail: t("timeDetail"),
      Icon: Clock3,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: t("words"),
      value: uniqueWordCount,
      detail: t("wordsDetail"),
      Icon: BookOpenCheck,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: t("hearts"),
      value: hearts,
      detail: t("heartsDetail"),
      Icon: Heart,
      tone: "bg-rose-50 text-rose-600",
    },
  ] as const;

  return (
    <>
      <Confetti
        recycle={false}
        numberOfPieces={180}
        gravity={0.14}
        tweenDuration={7_000}
        width={width}
        height={height}
        className="pointer-events-none motion-reduce:hidden"
        aria-hidden="true"
      />

      <header className="flex min-h-16 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black">VoCaBu</p>
            <p className="text-xs text-muted-foreground">{t("headerLabel")}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-600">
          <Heart className="h-4 w-4 fill-current" />
          {hearts}
        </span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--primary)/0.06))]">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <section className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary ring-4 ring-primary/15" />
              {t("completedBadge")}
            </span>

            <div className="relative mx-auto mt-5 h-40 w-40 sm:h-48 sm:w-48">
              <span className="absolute inset-0 rounded-full border border-dashed border-primary/40 motion-safe:animate-[spin_24s_linear_infinite]" />
              <span className="absolute inset-5 rounded-full border border-primary/15 motion-safe:animate-[spin_32s_linear_infinite_reverse]" />
              <span className="absolute inset-10 flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#6ee7b7,hsl(var(--primary))_60%,#047857)] shadow-[0_20px_45px_-22px_rgba(4,120,87,0.8)]">
                <span
                  className="text-6xl drop-shadow-md motion-safe:animate-[bounce_2.4s_ease-in-out_infinite]"
                  role="img"
                  aria-label={t("illustrationAlt")}
                >
                  🎉
                </span>
              </span>
              <span className="absolute -left-4 top-5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
                {perfect ? t("perfectChip") : t("completedChip")}
              </span>
              <span className="absolute -right-5 bottom-8 rounded-full border bg-card px-3 py-1.5 text-xs font-bold shadow-sm">
                +{earnedXp} XP
              </span>
            </div>

            <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
              {t("description", { lesson: lessonTitle })}
            </p>
          </section>

          <section className="mx-auto mt-7 flex max-w-md items-center justify-center gap-4 rounded-2xl border border-primary/15 bg-card p-4 shadow-[0_16px_36px_-28px_rgba(4,120,87,0.7)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Zap className="h-6 w-6 fill-current" />
            </span>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("xpEarned")}
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums">
                {earnedXp} <span className="text-sm font-semibold text-muted-foreground">XP</span>
              </p>
            </div>
          </section>

          <section aria-label={t("statsLabel")} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, detail, Icon, tone }) => (
              <article key={label} className="rounded-2xl border bg-card p-4 sm:p-5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-4 text-2xl font-black tabular-nums">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${perfect ? "bg-amber-100 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                  {perfect ? <Award className="h-7 w-7" /> : <Target className="h-7 w-7" />}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-[0.12em] ${perfect ? "text-amber-700" : "text-rose-600"}`}>
                    {perfect ? t("perfectLabel") : t("reviewLabel")}
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    {perfect ? t("perfectTitle") : t("reviewTitle", { count: weakWords.length })}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {perfect ? t("perfectDescription") : t("reviewDescription")}
                  </p>
                  {!perfect && weakWords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {weakWords.slice(0, 6).map((item) => (
                        <span key={item.vocabularyItemId} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">
                          {item.word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <Link
              href={continueHref}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  {nextLesson ? t("upNext") : t("courseMap")}
                </span>
                <span className="mt-1 block truncate text-lg font-black">
                  {nextLesson?.title ?? t("backToLearning")}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {nextLesson ? t("nextDescription") : t("mapDescription")}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" />
            </Link>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t bg-background px-4 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="default" size="lg">
            <Link href={`/lesson/${lessonId}`}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("practiceAgain")}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={continueHref}>
              {nextLesson ? t("continue") : t("backToMap")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </footer>
    </>
  );
}
