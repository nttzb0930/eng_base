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
          className="min-w-32 gap-2 rounded-md tabular-nums"
          aria-label={t("practice.openQuestionList", { current, total })}
        >
          <Grid2X2 className="h-4 w-4" aria-hidden="true" />
          {t("practice.questionPosition", { current, total })}
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
