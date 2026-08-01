"use client";

import type { ToeicListeningTestDetail } from "@repo/shared";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

type ToeicListeningNavigationProps = {
  test: ToeicListeningTestDetail;
  activeQuestionId: number | null;
  answers: Record<number, number>;
  reviewQuestionIds: number[];
  onSelect: (questionId: number) => void;
};

export function ToeicListeningNavigation({
  test,
  activeQuestionId,
  answers,
  reviewQuestionIds,
  onSelect,
}: ToeicListeningNavigationProps) {
  const t = useTranslations("toeicListening.session");
  return (
    <nav
      aria-label={t("questionNavigation")}
      className="bg-card rounded-2xl border p-5"
    >
      <h2 className="font-semibold">{t("navigation")}</h2>
      <div className="mt-4 space-y-5">
        {test.parts.map((part) => (
          <section key={part.part}>
            <h3 className="text-muted-foreground text-xs font-semibold">
              {t("partLabel", { part: part.part })}
            </h3>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {part.questions.map((question) => {
                const answered = answers[question.id] !== undefined;
                const review = reviewQuestionIds.includes(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    aria-current={
                      activeQuestionId === question.id ? "true" : undefined
                    }
                    aria-label={t("goToQuestion", {
                      number: question.number,
                    })}
                    onClick={() => onSelect(question.id)}
                    className={cn(
                      "relative flex h-10 items-center justify-center rounded-full border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      activeQuestionId === question.id
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : answered
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-background"
                    )}
                  >
                    {question.number}
                    {review ? (
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="text-muted-foreground mt-5 space-y-1 border-t pt-4 text-xs">
        <p>{t("legendAnswered")}</p>
        <p>{t("legendReview")}</p>
      </div>
    </nav>
  );
}
