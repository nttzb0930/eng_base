"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Flag,
  Headphones,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import {
  useSubmitToeicDictation,
  useToeicDictationCheckItem,
  useToeicDictationFullItem,
  useToeicDictationMedia,
  useToeicDictationProgress,
  useToeicDictationSet,
} from "@/app/features/toeic-dictation/hooks/use-toeic-dictation";
import {
  mergeToeicDictationCheckFeedback,
  type ToeicDictationCheckFeedbackSegment,
} from "@/app/features/toeic-dictation/toeic-dictation-check-feedback";
import type {
  ToeicDictationItem,
  ToeicDictationRevealCount,
  ToeicDictationSubmitResult,
} from "@repo/shared";

type Props = { setId: number; mode?: "check" | "dictation" | "full" };

type Lesson = {
  key: string;
  items: ToeicDictationItem[];
};

const modes = [
  { key: "check", message: "modeCheck" as const },
  { key: "dictation", message: "modeDictation" as const },
  { key: "full", message: "modeFull" as const },
];

export function ToeicDictationSessionView({
  setId,
  mode = "dictation",
}: Props) {
  const t = useTranslations("toeicDictation.session");
  const setQuery = useToeicDictationSet(setId);
  const progressQuery = useToeicDictationProgress(setId);
  const [index, setIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [checkAnswers, setCheckAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ToeicDictationSubmitResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hidePercent, setHidePercent] = useState<30 | 50 | 100>(50);
  const [hintCount, setHintCount] = useState<ToeicDictationRevealCount>(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const submit = useSubmitToeicDictation();
  const item = setQuery.data?.items[index];
  const mediaQuery = useToeicDictationMedia(item?.mediaId ?? 0);
  const checkQuery = useToeicDictationCheckItem(
    item?.id ?? 0,
    hidePercent,
    hintCount
  );
  const fullQuery = useToeicDictationFullItem(item?.id ?? 0, mode === "full");
  const progressByItem = useMemo(
    () =>
      new Map(
        (progressQuery.data?.items ?? []).map((entry) => [entry.itemId, entry])
      ),
    [progressQuery.data]
  );
  const lessons = useMemo<Lesson[]>(() => {
    const groups = new Map<string, ToeicDictationItem[]>();
    for (const current of setQuery.data?.items ?? []) {
      const key = current.groupId ?? `lesson-${Math.ceil(current.order / 4)}`;
      groups.set(key, [...(groups.get(key) ?? []), current]);
    }
    return [...groups.entries()].map(([key, items]) => ({ key, items }));
  }, [setQuery.data]);

  useEffect(() => {
    if (!setQuery.data || !progressQuery.data) return;
    const firstUnanswered = setQuery.data.items.findIndex(
      (entry) => !progressByItem.get(entry.id)?.lastAttemptedAt
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  }, [setQuery.data, progressQuery.data, progressByItem]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedText("");
    setCheckAnswers({});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintCount(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealedCount(0);
  }, [item?.id]);

  useEffect(() => {
    if (!mediaQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(mediaQuery.data);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaQuery.data]);

  if (setQuery.isLoading || progressQuery.isLoading) {
    return (
      <div
        className="bg-muted/30 min-h-dvh animate-pulse"
        role="status"
        aria-busy="true"
      />
    );
  }
  if (
    setQuery.isError ||
    progressQuery.isError ||
    !setQuery.data ||
    !progressQuery.data
  ) {
    return (
      <FeedWrapper>
        <section className="mx-auto mt-16 max-w-lg rounded-2xl border border-rose-200 p-7 text-center">
          <h1 className="text-lg font-semibold">{t("error")}</h1>
          <Button
            type="button"
            onClick={() => {
              void setQuery.refetch();
              void progressQuery.refetch();
            }}
            className="mt-5 gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("saved")}
          </Button>
        </section>
      </FeedWrapper>
    );
  }
  if (!item) {
    return (
      <FeedWrapper>
        <section className="mx-auto mt-16 max-w-lg rounded-2xl border border-dashed p-10 text-center">
          <Headphones className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-4 text-sm">{t("empty")}</p>
        </section>
      </FeedWrapper>
    );
  }

  const saved = progressByItem.get(item.id);
  const checkText = (checkQuery.data?.segments ?? [])
    .filter((segment) => segment.hidden)
    .map(
      (segment) => segment.text ?? checkAnswers[segment.wordIndex ?? -1] ?? ""
    )
    .join(" ");
  const submissionText = mode === "check" ? checkText : typedText;
  const onSubmit = () => {
    if (!submissionText.trim() || submit.isPending) return;
    submit.mutate(
      {
        itemId: item.id,
        payload: {
          itemId: item.id,
          sourceVersion: setQuery.data.sourceVersion,
          typedText: submissionText,
          submissionKey: crypto.randomUUID(),
          mode,
          hidePercent: mode === "check" ? hidePercent : undefined,
        },
      },
      {
        onSuccess: (nextResult) => {
          setResult(nextResult);
          if (mode === "check") setRevealedCount(nextResult.words.length);
        },
      }
    );
  };
  const selectItem = (nextItem: ToeicDictationItem) => {
    const nextIndex = setQuery.data.items.findIndex(
      (entry) => entry.id === nextItem.id
    );
    if (nextIndex >= 0) setIndex(nextIndex);
  };
  const checkFeedback = result
    ? mergeToeicDictationCheckFeedback(
        checkQuery.data?.segments ?? [],
        result.words
      )
    : [];

  return (
    <FeedWrapper>
      <div className="bg-background min-h-dvh">
        <header className="bg-background border-b">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/learn/cert/toeic/listening?mode=dictation"
              className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("back")}
            </Link>
            <div
              className="bg-muted/60 inline-flex rounded-xl p-1"
              aria-label={t("modeLabel")}
            >
              {modes.map((modeOption) => (
                <Link
                  href={`/toeic/dictation/sets/${setId}?practice=${modeOption.key}`}
                  aria-current={mode === modeOption.key ? "page" : undefined}
                  key={modeOption.key}
                  title={
                    modeOption.key === "dictation"
                      ? undefined
                      : t("modeUnavailable")
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === modeOption.key ? "bg-slate-800 text-white" : "text-muted-foreground hover:bg-background"}`}
                >
                  {t(modeOption.message)}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1280px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            className="bg-muted/20 border-b p-4 lg:min-h-[calc(100dvh-57px)] lg:border-b-0 lg:border-r lg:p-5"
            aria-label={t("sidebarLabel")}
          >
            <div className="border-b pb-4">
              <h1 className="text-sm font-bold uppercase tracking-wide">
                {t("testTitle", { test: setQuery.data.testNumber })}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("lessonCount", {
                  lessons: lessons.length,
                  questions: setQuery.data.itemCount,
                })}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {lessons.map((lesson, lessonIndex) => {
                const answered = lesson.items.filter(
                  (entry) => progressByItem.get(entry.id)?.lastAttemptedAt
                ).length;
                const active = lesson.items.some(
                  (entry) => entry.id === item.id
                );
                return (
                  <details
                    key={lesson.key}
                    open={active || answered > 0}
                    className="group"
                  >
                    <summary
                      className={`flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-emerald-500 text-white" : "hover:bg-muted"}`}
                    >
                      <ChevronDown
                        className="h-4 w-4 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                      <Headphones className="h-4 w-4" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        {t("lesson", { lesson: lessonIndex + 1 })}
                      </span>
                      <span className="text-xs">
                        {answered}/{lesson.items.length}
                      </span>
                    </summary>
                    <div className="ml-5 border-l border-emerald-200 py-1 pl-2 dark:border-emerald-900">
                      {lesson.items.map((lessonItem, itemIndex) => {
                        const itemProgress = progressByItem.get(lessonItem.id);
                        const selected = lessonItem.id === item.id;
                        return (
                          <button
                            key={lessonItem.id}
                            type="button"
                            onClick={() => selectItem(lessonItem)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${selected ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "text-muted-foreground hover:bg-muted"}`}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]">
                              {itemProgress?.mastered ? "✓" : itemIndex + 1}
                            </span>
                            <span>{t("item", { item: itemIndex + 1 })}</span>
                            {itemProgress?.mastered && (
                              <CheckCircle2
                                className="ml-auto h-3.5 w-3.5 text-emerald-600"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold">
                  {t("question", {
                    current: index + 1,
                    total: setQuery.data.items.length,
                  })}
                </span>
                <span className="text-muted-foreground">
                  {saved?.mastered
                    ? t("mastered")
                    : saved
                      ? t("accuracy", { accuracy: saved.latestAccuracy })
                      : t("saved")}
                </span>
              </div>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width]"
                  style={{
                    width: `${((index + 1) / setQuery.data.items.length) * 100}%`,
                  }}
                />
              </div>

              <div className="bg-card mt-6 rounded-2xl border p-5 shadow-sm sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        setIndex((current) => Math.max(0, current - 1))
                      }
                      className="text-muted-foreground hover:bg-muted rounded-lg p-2 disabled:opacity-40"
                      aria-label={t("previous")}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-semibold">
                      {t("question", {
                        current: index + 1,
                        total: setQuery.data.items.length,
                      })}
                    </span>
                    <button
                      type="button"
                      disabled={index === setQuery.data.items.length - 1}
                      onClick={() =>
                        setIndex((current) =>
                          Math.min(setQuery.data.items.length - 1, current + 1)
                        )
                      }
                      className="text-muted-foreground hover:bg-muted rounded-lg p-2 disabled:opacity-40"
                      aria-label={t("next")}
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3">
                    <Flag className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs">
                      {item.durationSeconds
                        ? `${Math.round(item.durationSeconds)}s`
                        : "—"}
                    </span>
                  </div>
                </div>
                {audioUrl ? (
                  <audio
                    className="mt-5 w-full"
                    controls
                    preload="metadata"
                    src={audioUrl}
                    aria-label={t("play")}
                  />
                ) : (
                  <p className="text-muted-foreground mt-5 rounded-xl border border-dashed p-4 text-sm">
                    {mediaQuery.isLoading
                      ? t("checking")
                      : t("audioUnavailable")}
                  </p>
                )}
                {mode === "full" ? (
                  <div className="bg-muted/50 mt-5 rounded-xl p-5">
                    {fullQuery.isLoading ? (
                      <p className="text-muted-foreground text-sm">
                        {t("checking")}
                      </p>
                    ) : fullQuery.data ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                          {t("transcript")}
                        </p>
                        <p className="mt-2 text-base leading-7">
                          {fullQuery.data.transcript}
                        </p>
                        {fullQuery.data.translationVi && (
                          <>
                            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-sky-700">
                              {t("translation")}
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm leading-6">
                              {fullQuery.data.translationVi}
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {t("audioUnavailable")}
                      </p>
                    )}
                  </div>
                ) : mode === "check" ? (
                  <div className="bg-muted/50 mt-5 rounded-xl p-4">
                    <div className="bg-background mb-4 flex items-center gap-1 rounded-xl p-1 text-xs font-semibold">
                      {[30, 50, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setHidePercent(value as 30 | 50 | 100);
                            setCheckAnswers({});
                            setResult(null);
                            setHintCount(0);
                            setRevealedCount(0);
                          }}
                          className={`rounded-lg px-3 py-1.5 transition-colors ${hidePercent === value ? "bg-slate-800 text-white" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-1 text-base leading-10"
                      aria-label={t("placeholder")}
                    >
                      {(result
                        ? checkFeedback
                        : (checkQuery.data?.segments ?? [])
                      ).map((segment) => {
                        if (!segment.hidden) {
                          return (
                            <span
                              key={segment.segmentIndex}
                              className="whitespace-pre-wrap"
                            >
                              {segment.text}
                            </span>
                          );
                        }

                        if (!result && segment.text !== null) {
                          return (
                            <span
                              key={segment.segmentIndex}
                              className="mx-1 inline-flex min-h-9 items-center rounded-md bg-emerald-100 px-2 text-sm font-medium text-emerald-700"
                            >
                              {segment.text}
                            </span>
                          );
                        }

                        if (!result) {
                          return (
                            <input
                              key={segment.segmentIndex}
                              aria-label={t("checkWord", {
                                number: (segment.wordIndex ?? 0) + 1,
                              })}
                              value={
                                checkAnswers[segment.wordIndex ?? -1] ?? ""
                              }
                              onChange={(event) =>
                                setCheckAnswers((current) => ({
                                  ...current,
                                  [segment.wordIndex ?? -1]: event.target.value,
                                }))
                              }
                              className="border-input bg-background mx-1 inline-block h-9 w-24 rounded-md border border-b-2 border-b-sky-400 px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            />
                          );
                        }

                        const feedback =
                          "result" in segment
                            ? (segment as ToeicDictationCheckFeedbackSegment)
                                .result
                            : null;
                        const revealIndex =
                          "hiddenIndex" in segment
                            ? ((segment as ToeicDictationCheckFeedbackSegment)
                                .hiddenIndex ?? 0)
                            : 0;
                        const isRevealed =
                          feedback && revealIndex < revealedCount;
                        return (
                          <span
                            key={segment.segmentIndex}
                            className={`mx-1 inline-flex min-h-9 items-center rounded-md px-2 text-sm font-medium ${isRevealed ? (feedback?.status === "CORRECT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-muted text-muted-foreground"}`}
                          >
                            {isRevealed ? (feedback?.expected ?? "—") : "•••"}
                          </span>
                        );
                      })}
                    </div>
                    {result?.translationVi && (
                      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                        <p className="font-semibold">{t("meaning")}</p>
                        <p className="mt-1 leading-6">{result.translationVi}</p>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {[1, 2, 3].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            if (result) setRevealedCount(count);
                            else setHintCount(count as 1 | 2 | 3);
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${result ? (revealedCount === count ? "border-sky-300 bg-sky-50 text-sky-700" : "border-input text-muted-foreground hover:bg-background") : hintCount === count ? "border-sky-300 bg-sky-50 text-sky-700" : "border-input text-muted-foreground hover:bg-background"}`}
                        >
                          {t("revealWords", { count })}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (result) setRevealedCount(result.words.length);
                          else setHintCount("all");
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${result ? (revealedCount >= result.words.length ? "border-sky-300 bg-sky-50 text-sky-700" : "border-input text-muted-foreground hover:bg-background") : hintCount === "all" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-input text-muted-foreground hover:bg-background"}`}
                      >
                        {t("revealAll")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckAnswers({});
                          setResult(null);
                          setHintCount(0);
                          setRevealedCount(0);
                        }}
                        className="text-muted-foreground hover:bg-background inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("reset")}
                      </button>
                    </div>
                    {!result && (
                      <Button
                        type="button"
                        disabled={!submissionText.trim() || submit.isPending}
                        onClick={onSubmit}
                        className="mt-4 min-h-11 w-full gap-2"
                      >
                        {submit.isPending ? t("checking") : t("submit")}
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    <p className="text-muted-foreground mt-4 text-center text-xs">
                      {t("keyboardHint")}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/50 mt-5 rounded-xl p-4">
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="dictation-answer"
                    >
                      {t("placeholder")}
                    </label>
                    <textarea
                      id="dictation-answer"
                      value={typedText}
                      onChange={(event) => setTypedText(event.target.value)}
                      rows={4}
                      maxLength={5000}
                      className="border-input bg-background mt-3 w-full resize-y rounded-xl border p-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      placeholder={t("placeholder")}
                    />
                    <Button
                      type="button"
                      disabled={!submissionText.trim() || submit.isPending}
                      onClick={onSubmit}
                      className="mt-3 min-h-11 w-full gap-2"
                    >
                      {submit.isPending ? t("checking") : t("submit")}
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
                {submit.isError && (
                  <p className="mt-3 text-sm text-rose-600">
                    {t("submitError")}
                  </p>
                )}
                {result && mode !== "check" && (
                  <div
                    className={`mt-5 rounded-xl border p-5 ${result.mastered ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}
                  >
                    <p className="font-semibold">
                      {result.mastered
                        ? t("mastered")
                        : t("accuracy", { accuracy: result.accuracy })}
                    </p>
                    <p className="mt-1 text-sm">
                      {t("correctWords", {
                        correct: result.wordsCorrect,
                        total: result.totalWords,
                      })}
                    </p>
                    <p className="mt-4 text-sm font-semibold">
                      {t("transcript")}
                    </p>
                    <p className="mt-1 text-sm">{result.transcript}</p>
                    {result.translationVi && (
                      <>
                        <p className="mt-4 text-sm font-semibold">
                          {t("translation")}
                        </p>
                        <p className="mt-1 text-sm">{result.translationVi}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() =>
                    setIndex((current) => Math.max(0, current - 1))
                  }
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("previous")}
                </Button>
                <Button
                  type="button"
                  disabled={index === setQuery.data.items.length - 1}
                  onClick={() =>
                    setIndex((current) =>
                      Math.min(setQuery.data.items.length - 1, current + 1)
                    )
                  }
                  className="gap-2"
                >
                  {t("next")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="text-muted-foreground mt-5 flex items-center justify-center gap-2 text-center text-xs">
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("play")}
              </p>
            </div>
          </section>
        </main>
      </div>
    </FeedWrapper>
  );
}
