import type { ToeicReadingPracticeAnswerResult } from "@repo/shared";
import { useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  Languages,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/app/utils/cn";

export function ToeicReadingFeedback({
  answer,
}: {
  answer?: ToeicReadingPracticeAnswerResult;
}) {
  const t = useTranslations("toeicReading");
  const [showExplanation, setShowExplanation] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showVocabulary, setShowVocabulary] = useState(true);

  if (!answer) return null;

  return (
    <section className="space-y-3" aria-live="polite">
      <div
        className={
          answer.correct
            ? "rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            : "rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
        }
      >
        <div className="flex items-center gap-2 font-semibold">
          {answer.correct ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          {answer.correct ? t("practice.correct") : t("practice.incorrect")}
        </div>
        {!answer.correct ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold">
              {t("practice.correctAnswer")}:
            </span>{" "}
            ({answer.correctOption.label}) {answer.correctOption.text}
          </p>
        ) : null}
      </div>

      {/* Toggleable: Giải thích chi tiết */}
      <div className="rounded-md border border-violet-200 bg-violet-50/70 transition-colors dark:border-violet-900 dark:bg-violet-950/50">
        <button
          type="button"
          onClick={() => setShowExplanation((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between p-4 text-left font-semibold text-violet-800 focus:outline-none dark:text-violet-200"
        >
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("practice.explanation")}</span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-70 transition-transform duration-300",
              showExplanation && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "grid overflow-hidden transition-all duration-300 ease-in-out",
            showExplanation
              ? "grid-rows-[1fr] opacity-100 border-t border-violet-200/60 dark:border-violet-900/60"
              : "grid-rows-[0fr] opacity-0 border-t-0"
          )}
        >
          <div className="min-h-0">
            <div className="px-4 pb-4 pt-3">
              <p className="whitespace-pre-wrap text-sm leading-6">
                {answer.explanation ?? t("practice.noExplanation")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toggleable: Dịch nghĩa câu hỏi & đáp án */}
      {answer.questionTranslation || answer.answerTranslations.length > 0 ? (
        <div className="rounded-md border border-sky-200 bg-sky-50/70 transition-colors dark:border-sky-900 dark:bg-sky-950/50">
          <button
            type="button"
            onClick={() => setShowTranslation((prev) => !prev)}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left font-semibold text-sky-800 focus:outline-none dark:text-sky-200"
          >
            <div className="flex items-center gap-2 text-sm">
              <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t("practice.translation")}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 opacity-70 transition-transform duration-300",
                showTranslation && "rotate-180"
              )}
            />
          </button>

          <div
            className={cn(
              "grid overflow-hidden transition-all duration-300 ease-in-out",
              showTranslation
                ? "grid-rows-[1fr] opacity-100 border-t border-sky-200/60 dark:border-sky-900/60"
                : "grid-rows-[0fr] opacity-0 border-t-0"
            )}
          >
            <div className="min-h-0">
              <div className="space-y-3 px-4 pb-4 pt-3">
                {answer.questionTranslation ? (
                  <div>
                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      {t("practice.translation")}:
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      {answer.questionTranslation}
                    </p>
                  </div>
                ) : null}
                {answer.answerTranslations.length > 0 ? (
                  <div className="border-t border-sky-200/40 pt-2">
                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      {t("practice.answerTranslations")}:
                    </p>
                    <div className="mt-1 space-y-1 text-sm leading-6">
                      {answer.answerTranslations.map((item) => (
                        <p key={item.label}>
                          <span className="font-semibold">({item.label})</span>{" "}
                          {item.text}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toggleable: Từ vựng nên học */}
      {answer.vocabulary.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/70 transition-colors dark:border-amber-900 dark:bg-amber-950/50">
          <button
            type="button"
            onClick={() => setShowVocabulary((prev) => !prev)}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left font-semibold text-amber-800 focus:outline-none dark:text-amber-200"
          >
            <div className="flex items-center gap-2 text-sm">
              <BookOpenText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t("practice.vocabulary")}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 opacity-70 transition-transform duration-300",
                showVocabulary && "rotate-180"
              )}
            />
          </button>

          <div
            className={cn(
              "grid overflow-hidden transition-all duration-300 ease-in-out",
              showVocabulary
                ? "grid-rows-[1fr] opacity-100 border-t border-amber-200/60 dark:border-amber-900/60"
                : "grid-rows-[0fr] opacity-0 border-t-0"
            )}
          >
            <div className="min-h-0">
              <div className="px-4 pb-4 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {answer.vocabulary.map((item) => (
                    <article
                      key={`${item.word}-${item.pos}`}
                      className="bg-background/70 rounded-md border border-amber-200/80 p-3 text-sm dark:border-amber-800"
                    >
                      <div className="flex items-baseline gap-2">
                        <strong>{item.word}</strong>
                        <span className="text-muted-foreground font-normal">{item.pos}</span>
                        <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          {item.cefrLevel}
                        </span>
                      </div>
                      <p className="mt-1 leading-6">{item.meaningVi}</p>
                      {item.exampleEn ? (
                        <p className="text-muted-foreground mt-2 italic leading-5">
                          {item.exampleEn}
                        </p>
                      ) : null}
                      {item.exampleVi ? (
                        <p className="text-muted-foreground mt-1 leading-5">
                          {item.exampleVi}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
