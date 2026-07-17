import { useLocale, useTranslations } from "next-intl";
import type { VocabularyItem } from "@repo/shared/vocabulary";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

import { VocabularyAudioButton } from "./VocabularyAudioButton";

type VocabularyCardProps = {
  item: VocabularyItem;
  savedAt?: Date;
  showMeaning?: boolean;
  due?: boolean;
  action?: {
    label: string;
    activeLabel?: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
  };
  className?: string;
};

const masteryConfig = {
  new: "bg-slate-100 text-slate-500",
  learning: "bg-sky-100 text-sky-600",
  review: "bg-amber-100 text-amber-700",
  mastered: "bg-green-100 text-green-700",
} as const;

const DAY_IN_MS = 86_400_000;

const getDaysUntilReview = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reviewDate = new Date(date);
  reviewDate.setHours(0, 0, 0, 0);

  return Math.ceil((reviewDate.getTime() - today.getTime()) / DAY_IN_MS);
};

export const VocabularyCard = ({
  item,
  savedAt,
  showMeaning = true,
  due = false,
  action,
  className,
}: VocabularyCardProps) => {
  const t = useTranslations("vocabulary");
  const locale = useLocale();
  const progress = item.userVocabularyProgress[0];
  const masteryLevel = progress?.masteryLevel ?? "new";
  const masteryClassName =
    masteryConfig[masteryLevel as keyof typeof masteryConfig] ??
    masteryConfig.new;
  const examples =
    item.vocabularyExamples.length > 0
      ? item.vocabularyExamples.slice(0, 2)
      : item.exampleEn
        ? [
            {
              id: item.id,
              exampleEn: item.exampleEn,
              exampleVi: item.exampleVi,
            },
          ]
        : [];
  const daysUntilReview = progress?.nextReviewAt
    ? getDaysUntilReview(progress.nextReviewAt)
    : null;
  const reviewScheduleLabel = progress
    ? !progress.nextReviewAt || daysUntilReview === null || daysUntilReview <= 0
      ? t("reviewDueToday")
      : daysUntilReview === 1
        ? t("reviewTomorrow")
        : daysUntilReview <= 14
          ? t("reviewInDays", { count: daysUntilReview })
          : t("reviewOn", {
              date: progress.nextReviewAt.toLocaleDateString(locale, {
                day: "2-digit",
                month: "2-digit",
              }),
            })
    : null;

  return (
    <article
      className={cn("rounded-lg border-2 bg-white p-4 shadow-sm", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-800">{item.word}</h2>
            {item.audioUrl && (
              <VocabularyAudioButton audioUrl={item.audioUrl} label={item.word} />
            )}
            {item.phonetic && (
              <span className="text-sm font-semibold text-slate-500">
                {item.phonetic}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1">
              {item.cefrLevel}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1">{item.pos}</span>
            <span className={cn("rounded-md px-2 py-1", masteryClassName)}>
              {t(`mastery.${masteryLevel as "new" | "learning" | "review" | "mastered"}`)}
            </span>
            {due && (
              <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-600">
                {t("due")}
              </span>
            )}
          </div>
        </div>

        {action ? (
          <Button
            type="button"
            variant={action.active ? "default" : "secondary"}
            size="sm"
            disabled={action.disabled}
            onClick={action.onClick}
            className="shrink-0"
          >
            {action.active ? (action.activeLabel ?? action.label) : action.label}
          </Button>
        ) : (
          savedAt && (
            <p className="text-sm text-muted-foreground">
              {savedAt.toLocaleDateString()}
            </p>
          )
        )}
      </div>

      {showMeaning && (
        <div className="mt-4">
          <p className="font-bold text-neutral-700">{item.primaryMeaningVi}</p>
          {item.meaningVi !== item.primaryMeaningVi && (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {item.meaningVi}
            </p>
          )}
          {examples.length > 0 && (
            <div className="mt-4 space-y-3 rounded-md bg-slate-50 p-3">
              {examples.map((example) => (
                <div key={example.id}>
                  <p className="text-sm font-semibold leading-6 text-neutral-700">
                    {example.exampleEn}
                  </p>
                  {example.exampleVi && (
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {example.exampleVi}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {progress && (
            <div className="mt-3 space-y-2 text-xs font-bold uppercase text-slate-500">
              {reviewScheduleLabel && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-green-700">
                  {reviewScheduleLabel}
                </p>
              )}
              <p>
                {t("reviewStats", {
                  reviewCount: progress.reviewCount,
                  correctCount: progress.correctCount,
                  wrongCount: progress.wrongCount,
                })}
              </p>
              <p>
                {t("scheduleStats", {
                  interval: progress.intervalDays,
                  repetition: progress.repetitionCount,
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
