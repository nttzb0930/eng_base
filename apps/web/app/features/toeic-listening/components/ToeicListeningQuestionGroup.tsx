"use client";

import type { ToeicListeningAnswerCheckResult } from "@repo/shared";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Languages,
  ListChecks,
  Loader2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

import type { ToeicListeningQuestionGroup as QuestionGroup } from "../toeic-listening-session-state";
type ToeicListeningQuestionGroupProps = {
  group: QuestionGroup;
  answers: Record<number, number>;
  reviewQuestionIds: number[];
  feedback: Record<number, ToeicListeningAnswerCheckResult>;
  checkingQuestionIds: number[];
  feedbackErrorQuestionIds: number[];
  onSelectAnswer: (questionId: number, optionId: number) => void;
  onToggleReview: (questionId: number) => void;
};

export function ToeicListeningQuestionGroup({
  group,
  answers,
  reviewQuestionIds,
  feedback,
  checkingQuestionIds,
  feedbackErrorQuestionIds,
  onSelectAnswer,
  onToggleReview,
}: ToeicListeningQuestionGroupProps) {
  const t = useTranslations("toeicListening.session");
  return (
    <div className="space-y-5">
      {group.questions.map((question) => {
        const questionFeedback = feedback[question.id];
        const checking = checkingQuestionIds.includes(question.id);
        const feedbackError = feedbackErrorQuestionIds.includes(question.id);
        return (
          <fieldset
            key={question.id}
            id={`toeic-listening-question-${question.id}`}
            tabIndex={-1}
            className={cn(
              "bg-card rounded-2xl border p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-6",
              questionFeedback?.correct && "border-emerald-400",
              questionFeedback && !questionFeedback.correct && "border-rose-300"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <legend className="font-semibold leading-7">
                <span className="mr-2 text-emerald-700 dark:text-emerald-300">
                  {question.number}.
                </span>
                {question.prompt ?? t("listenAndChoose")}
              </legend>
              <Button
                type="button"
                onClick={() => onToggleReview(question.id)}
                aria-pressed={reviewQuestionIds.includes(question.id)}
                className="shrink-0 gap-2"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                {reviewQuestionIds.includes(question.id)
                  ? t("marked")
                  : t("markForReview")}
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                const isCorrectOption =
                  questionFeedback?.correctOptionId === option.id;
                const isIncorrectSelection =
                  Boolean(questionFeedback) &&
                  selected &&
                  !questionFeedback?.correct;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectAnswer(question.id, option.id)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      isCorrectOption
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                        : isIncorrectSelection
                          ? "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100"
                          : selected
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                            : "bg-background hover:border-emerald-300"
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-semibold text-emerald-700 dark:text-emerald-300">
                      {option.label}
                    </span>
                    {option.text ? <span>{option.text}</span> : null}
                    {isCorrectOption ? (
                      <CheckCircle2
                        className="ml-auto h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                    ) : isIncorrectSelection ? (
                      <XCircle
                        className="ml-auto h-5 w-5 shrink-0 text-rose-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-6 text-sm" aria-live="polite">
              {checking ? (
                <span className="text-muted-foreground inline-flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("checkingAnswer")}
                </span>
              ) : questionFeedback ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 font-semibold",
                    questionFeedback.correct
                      ? "text-emerald-700"
                      : "text-rose-700"
                  )}
                >
                  {questionFeedback.correct ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {questionFeedback.correct
                    ? t("answerCorrect")
                    : t("answerIncorrect", {
                        answer: questionFeedback.correctOptionLabel,
                      })}
                </span>
              ) : feedbackError ? (
                <span className="text-rose-700">{t("checkAnswerError")}</span>
              ) : null}
            </div>

            {questionFeedback ? (
              <div className="mt-4 grid gap-3 border-t pt-4">
                {questionFeedback.answerTranslations.length > 0 ? (
                  <details className="group rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                      <ListChecks className="h-5 w-5" aria-hidden="true" />
                      {t("answerTranslations")}
                    </summary>
                    <ul className="mt-3 grid gap-2 text-sm leading-6">
                      {questionFeedback.answerTranslations.map((answer) => (
                        <li key={answer.label}>
                          <span className="mr-2 font-semibold text-emerald-700 dark:text-emerald-300">
                            ({answer.label})
                          </span>
                          {answer.text}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {questionFeedback.questionTranslation ||
                questionFeedback.transcriptTranslation ||
                questionFeedback.explanation ? (
                  <details className="group rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                      <Languages className="h-5 w-5" aria-hidden="true" />
                      {group.part <= 2
                        ? t("questionTranslation")
                        : t("listeningContentTranslation")}
                    </summary>
                    <div className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
                      {questionFeedback.questionTranslation ? (
                        <p>{questionFeedback.questionTranslation}</p>
                      ) : questionFeedback.transcriptTranslation ? (
                        <p>{questionFeedback.transcriptTranslation}</p>
                      ) : null}
                      {questionFeedback.explanation ? (
                        <p className="text-foreground border-t border-blue-200 pt-2 dark:border-blue-900">
                          {questionFeedback.explanation}
                        </p>
                      ) : null}
                    </div>
                  </details>
                ) : null}

                <details className="group rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                    {t("vocabularyToLearn")}
                  </summary>
                  {questionFeedback.vocabulary.length > 0 ? (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {questionFeedback.vocabulary.map((item) => (
                        <li
                          key={`${item.word}-${item.pos}`}
                          className="bg-background rounded-lg border p-4 text-sm sm:col-span-2"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold">{item.word}</span>
                            {item.ipaUs ? (
                              <span className="text-muted-foreground">
                                US /{item.ipaUs}/
                              </span>
                            ) : null}
                            {item.ipaUk ? (
                              <span className="text-muted-foreground">
                                UK /{item.ipaUk}/
                              </span>
                            ) : null}
                            <span className="text-muted-foreground text-xs uppercase">
                              {item.pos} · {item.cefrLevel}
                            </span>
                          </div>
                          <p className="mt-1">{item.meaningVi}</p>
                          {item.exampleEn ? (
                            <blockquote className="mt-3 border-l-2 border-amber-400 pl-3">
                              <p className="italic">
                                &ldquo;{item.exampleEn}&rdquo;
                              </p>
                              {item.exampleVi ? (
                                <p className="text-muted-foreground mt-1">
                                  {item.exampleVi}
                                </p>
                              ) : null}
                            </blockquote>
                          ) : null}
                          {item.collocations.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-muted-foreground font-medium">
                                {t("collocations")}:
                              </span>
                              {item.collocations.map((collocation) => (
                                <span
                                  key={`${collocation.en}-${collocation.vi}`}
                                  className="rounded-md bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                                >
                                  <strong>{collocation.en}</strong> â€“{" "}
                                  {collocation.vi}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {item.synonym ? (
                            <p className="text-muted-foreground mt-3">
                              <span className="font-medium">
                                {t("synonym")}:
                              </span>{" "}
                              <strong className="text-foreground">
                                {item.synonym.en}
                              </strong>{" "}
                              â€“ {item.synonym.vi}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      {t("vocabularyUnavailable")}
                    </p>
                  )}
                </details>
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
