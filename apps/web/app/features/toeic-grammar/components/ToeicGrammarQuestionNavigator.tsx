import type {
  ToeicGrammarAnswerResult,
  ToeicGrammarLearnerQuestion,
} from "@repo/shared";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

type ToeicGrammarQuestionNavigatorProps = {
  questions: ToeicGrammarLearnerQuestion[];
  activeQuestionId: number | null;
  feedback: Record<number, ToeicGrammarAnswerResult>;
  onSelect: (questionId: number) => void;
};

export function ToeicGrammarQuestionNavigator({
  questions,
  activeQuestionId,
  feedback,
  onSelect,
}: ToeicGrammarQuestionNavigatorProps) {
  const t = useTranslations("toeicGrammar.practice");

  return (
    <div>
      <h2 className="font-semibold">{t("navigator")}</h2>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {questions.map((question, index) => {
          const result = feedback[question.id];
          const correct =
            result?.correct ?? question.progress.lastCorrect === true;
          const incorrect = result
            ? !result.correct
            : question.progress.lastCorrect === false;
          const current = activeQuestionId === question.id;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(question.id)}
              aria-current={current ? "step" : undefined}
              aria-label={t("goToQuestion", { number: index + 1 })}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                current && "border-sky-500 bg-sky-500 text-white",
                !current &&
                  correct &&
                  "border-emerald-500 bg-emerald-50 text-emerald-700",
                !current &&
                  incorrect &&
                  "border-rose-500 bg-rose-50 text-rose-700",
                !current &&
                  !correct &&
                  !incorrect &&
                  "bg-muted/50 text-muted-foreground"
              )}
            >
              {index + 1}
              {!current && correct ? (
                <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-emerald-600 p-0.5 text-white" />
              ) : null}
              {!current && incorrect ? (
                <X className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-rose-600 p-0.5 text-white" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          {t("legendCorrect")}
        </span>
        <span className="inline-flex items-center gap-1">
          <X className="h-3.5 w-3.5 text-rose-600" />
          {t("legendIncorrect")}
        </span>
        <span>{t("legendUnanswered")}</span>
      </div>
    </div>
  );
}
