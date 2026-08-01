import type { ToeicReadingTestDetail } from "@repo/shared";
import { Bookmark, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ToeicReadingSessionState } from "../toeic-reading-session-state";
import { cn } from "@/app/utils/cn";

type ToeicPartNavigationProps = {
  test: ToeicReadingTestDetail;
  state: ToeicReadingSessionState;
  activeQuestionId: number | null;
  onSelectQuestion: (questionId: number) => void;
};

export function ToeicPartNavigation({
  test,
  state,
  activeQuestionId,
  onSelectQuestion,
}: ToeicPartNavigationProps) {
  const t = useTranslations("toeicReading");

  return (
    <nav
      aria-label={t("session.questionNavigation")}
      className="bg-card rounded-2xl border p-4"
    >
      <h2 className="text-sm font-semibold">{t("session.navigation")}</h2>
      <div className="mt-4 space-y-5">
        {test.parts.map((part) => (
          <section key={part.part}>
            <h3 className="text-muted-foreground text-xs font-semibold">
              {t("part", { part: part.part })}
            </h3>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {part.questions.map((question) => {
                const answered = state.answers[question.id] !== undefined;
                const marked = state.reviewQuestionIds.includes(question.id);
                return (
                  <button
                    type="button"
                    key={question.id}
                    onClick={() => onSelectQuestion(question.id)}
                    aria-current={
                      activeQuestionId === question.id ? "step" : undefined
                    }
                    aria-label={t("session.goToQuestion", {
                      number: question.number,
                    })}
                    className={cn(
                      "inline-flex h-9 items-center justify-center gap-1 rounded-lg border px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      marked
                        ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        : answered
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : "text-muted-foreground hover:border-emerald-400",
                      activeQuestionId === question.id &&
                        "ring-offset-background ring-2 ring-emerald-500 ring-offset-2"
                    )}
                  >
                    {marked ? (
                      <Bookmark
                        className="h-3 w-3 fill-current"
                        aria-hidden="true"
                      />
                    ) : answered ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : null}
                    {question.number}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="text-muted-foreground mt-5 space-y-2 border-t pt-4 text-xs">
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          <span>{t("session.legendAnswered")}</span>
        </p>
        <p className="flex items-center gap-2">
          <Bookmark
            className="h-3.5 w-3.5 fill-current text-amber-700"
            aria-hidden="true"
          />
          <span>{t("session.legendReview")}</span>
        </p>
      </div>
    </nav>
  );
}
