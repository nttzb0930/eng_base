import type {
  ToeicReadingLearnerQuestion,
  ToeicReadingPracticeAnswerResult,
} from "@repo/shared";
import { Bookmark, CheckCircle2, Grid2X2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { cn } from "@/app/utils/cn";

type ToeicReadingQuestionDrawerProps = {
  questions: ToeicReadingLearnerQuestion[];
  answers: ToeicReadingPracticeAnswerResult[];
  reviewQuestionIds: number[];
  activeQuestionId: number;
  current: number;
  total: number;
  onSelect: (questionId: number) => void;
};

export function ToeicReadingQuestionSidebar({
  questions,
  answers,
  reviewQuestionIds,
  activeQuestionId,
  current,
  total,
  onSelect,
}: ToeicReadingQuestionDrawerProps) {
  const t = useTranslations("toeicReading");
  const progressValue = total === 0 ? 0 : (answers.length / total) * 100;

  return (
    <aside className="bg-card flex flex-col gap-4 rounded-md border p-5 shadow-sm dark:bg-slate-900">
      <div>
        <h3 className="text-foreground text-base font-bold">
          {t("practice.questionList")}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">
          {t("practice.drawerProgress", {
            answered: answers.length,
            total,
            percent: Math.round(progressValue),
          })}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((question) => {
          const answer = answers.find(
            (item) => item.questionId === question.id
          );
          const marked = reviewQuestionIds.includes(question.id);
          const active = activeQuestionId === question.id;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(question.id)}
              aria-current={active ? "step" : undefined}
              aria-label={t("practice.goToQuestion", {
                number: question.number,
              })}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1 rounded-md border text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                !answer &&
                "bg-white text-slate-600 hover:border-emerald-400 dark:bg-slate-800 dark:text-slate-300",
                answer?.correct &&
                "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                answer &&
                !answer.correct &&
                "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
                marked &&
                "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                active && "ring-2 ring-emerald-500 ring-offset-2"
              )}
            >
              {marked ? (
                <Bookmark
                  className="h-3 w-3 fill-current"
                  aria-hidden="true"
                />
              ) : answer?.correct ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : answer ? (
                <XCircle className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {question.number}
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground space-y-1.5 border-t pt-4 text-xs font-medium">
        <p>{t("practice.legendCorrect")}</p>
        <p>{t("practice.legendIncorrect")}</p>
        <p>{t("practice.legendUnanswered")}</p>
        <p>{t("practice.legendMarked")}</p>
      </div>
    </aside>
  );
}

export function ToeicReadingQuestionDrawer({
  questions,
  answers,
  reviewQuestionIds,
  activeQuestionId,
  current,
  total,
  onSelect,
}: ToeicReadingQuestionDrawerProps) {
  const t = useTranslations("toeicReading");
  const progressValue = total === 0 ? 0 : (answers.length / total) * 100;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="gap-1.5 rounded-md px-3 text-xs font-semibold tabular-nums shrink-0 sm:px-4 sm:text-sm"
          aria-label={t("practice.openQuestionList", { current, total })}
        >
          <Grid2X2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sm:hidden">{current}/{total}</span>
          <span className="hidden sm:inline">
            {t("practice.questionPosition", { current, total })}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={t("practice.closeQuestionList")}
        className="w-[min(92vw,24rem)] overflow-y-auto sm:max-w-sm"
      >
        <SheetHeader>
          <SheetTitle>{t("practice.questionList")}</SheetTitle>
          <SheetDescription>
            {t("practice.drawerProgress", {
              answered: answers.length,
              total,
              percent: Math.round(progressValue),
            })}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {questions.map((question) => {
            const answer = answers.find(
              (item) => item.questionId === question.id
            );
            const marked = reviewQuestionIds.includes(question.id);
            const active = activeQuestionId === question.id;
            return (
              <SheetClose asChild key={question.id}>
                <button
                  type="button"
                  onClick={() => onSelect(question.id)}
                  aria-current={active ? "step" : undefined}
                  aria-label={t("practice.goToQuestion", {
                    number: question.number,
                  })}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-1 rounded-md border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    !answer && "text-muted-foreground hover:border-emerald-400",
                    answer?.correct &&
                    "border-emerald-500 bg-emerald-50 text-emerald-800",
                    answer &&
                    !answer.correct &&
                    "border-rose-500 bg-rose-50 text-rose-800",
                    marked && "border-amber-400 bg-amber-50 text-amber-800",
                    active && "ring-2 ring-emerald-500 ring-offset-2"
                  )}
                >
                  {marked ? (
                    <Bookmark
                      className="h-3 w-3 fill-current"
                      aria-hidden="true"
                    />
                  ) : answer?.correct ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : answer ? (
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {question.number}
                </button>
              </SheetClose>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-6 space-y-2 border-t pt-4 text-xs">
          <p>{t("practice.legendCorrect")}</p>
          <p>{t("practice.legendIncorrect")}</p>
          <p>{t("practice.legendUnanswered")}</p>
          <p>{t("practice.legendMarked")}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
