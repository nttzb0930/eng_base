"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Headphones,
  RotateCcw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import {
  CompactAudioPlayer,
  type CompactAudioPlayerHandle,
} from "@/app/features/toeic-dictation/components/CompactAudioPlayer";
import { ToeicDictationFullPlayer } from "@/app/features/toeic-dictation/components/ToeicDictationFullPlayer";
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
  const [typedWords, setTypedWords] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ToeicDictationSubmitResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hidePercent, setHidePercent] = useState<30 | 50 | 100>(50);
  const [hintCount, setHintCount] = useState<ToeicDictationRevealCount>(0);
  const [revealedWordIndexes, setRevealedWordIndexes] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const audioPlayerRef = useRef<CompactAudioPlayerHandle>(null);
  const appliedDictationHintIndexesRef = useRef<Set<number>>(new Set());
  const focusedDictationInputKeyRef = useRef<string | null>(null);
  const submit = useSubmitToeicDictation();
  const item = setQuery.data?.items[index];
  const mediaQuery = useToeicDictationMedia(item?.mediaId ?? 0);
  const checkQuery = useToeicDictationCheckItem(
    item?.id ?? 0,
    hidePercent,
    mode === "check" ? "all" : 0,
    mode === "dictation" ? revealedWordIndexes : []
  );
  const checkSegments = useMemo(() => {
    const segments = checkQuery.data?.segments ?? [];
    return segments.map((segment, segmentIndex) => {
      if (!segment.hidden) return segment;
      const hiddenIndex = segments
        .slice(0, segmentIndex)
        .filter((previous) => previous.hidden).length;
      const shouldRevealFromHint =
        hintCount === "all" ||
        (typeof hintCount === "number" && hiddenIndex < hintCount);
      const shouldRevealFromClick =
        segment.wordIndex !== null &&
        revealedWordIndexes.includes(segment.wordIndex);
      return shouldRevealFromHint || shouldRevealFromClick
        ? segment
        : { ...segment, text: null };
    });
  }, [checkQuery.data?.segments, hintCount, revealedWordIndexes]);
  const fullQuery = useToeicDictationFullItem(item?.id ?? 0, mode === "full");
  const dictationSegments = checkQuery.data?.segments ?? [];
  const dictationHiddenWordIndexes = dictationSegments.flatMap((segment) =>
    segment.hidden && segment.wordIndex !== null ? [segment.wordIndex] : []
  );
  const revealedDictationHintCount = dictationSegments.filter(
    (segment) => segment.hidden && segment.text !== null
  ).length;
  const inlineSubmissionText = dictationSegments
    .map((segment) =>
      segment.hidden && segment.wordIndex !== null
        ? (typedWords[segment.wordIndex] ?? segment.text ?? "")
        : (segment.text ?? "")
    )
    .join("");
  const submissionText = hidePercent === 100 ? typedText : inlineSubmissionText;
  const onSubmit = () => {
    if (!item || !setQuery.data || !submissionText.trim() || submit.isPending) return;
    submit.mutate(
      {
        itemId: item.id,
        payload: {
          itemId: item.id,
          sourceVersion: setQuery.data.sourceVersion,
          typedText: submissionText,
          submissionKey: crypto.randomUUID(),
          mode,
          hidePercent: undefined,
        },
      },
      {
        onSuccess: (nextResult) => {
          setResult(nextResult);
        },
      }
    );
  };
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedWords({});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintCount(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealedWordIndexes([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealedCount(0);
    appliedDictationHintIndexesRef.current.clear();
  }, [item?.id]);

  useEffect(() => {
    if (
      mode !== "dictation" ||
      hidePercent === 100 ||
      result ||
      !item ||
      !checkQuery.data?.segments.length
    ) {
      return;
    }
    const focusKey = `${item.id}:${hidePercent}`;
    if (focusedDictationInputKeyRef.current === focusKey) return;

    const frame = window.requestAnimationFrame(() => {
      const firstBlank = [...document.querySelectorAll<HTMLInputElement>(
        "input[data-dictation-word]:not(:disabled)"
      )].find((input) => !input.value.trim());
      if (!firstBlank) return;
      firstBlank.focus();
      focusedDictationInputKeyRef.current = focusKey;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [checkQuery.data?.segments, hidePercent, item, mode, result]);

  useEffect(() => {
    if (mode !== "dictation" || hidePercent !== 100) return;
    const newlyRevealedWords = (checkQuery.data?.segments ?? [])
      .filter(
        (segment) =>
          segment.hidden &&
          segment.wordIndex !== null &&
          segment.text !== null &&
          !appliedDictationHintIndexesRef.current.has(segment.wordIndex)
      )
      .sort((left, right) => (left.wordIndex ?? 0) - (right.wordIndex ?? 0));
    if (newlyRevealedWords.length === 0) return;

    for (const segment of newlyRevealedWords) {
      appliedDictationHintIndexesRef.current.add(segment.wordIndex!);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedText((current) =>
      `${current}${current.trim() ? " " : ""}${newlyRevealedWords.map((segment) => segment.text).join(" ")}`
    );
  }, [checkQuery.data?.segments, hidePercent, mode]);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

      if (event.key === "Control" && !event.repeat) {
        audioPlayerRef.current?.replay();
        return;
      }

      if (event.key === "Tab" && mode === "dictation") {
        const nextWordIndex = checkQuery.data?.segments.find(
          (segment) =>
            segment.hidden &&
            segment.wordIndex !== null &&
            segment.text === null &&
            !revealedWordIndexes.includes(segment.wordIndex)
        )?.wordIndex;
        if (nextWordIndex !== undefined && nextWordIndex !== null) {
          event.preventDefault();
          setRevealedWordIndexes((current) => [...current, nextWordIndex]);
        }
        return;
      }

      if (event.key === "Tab" && mode === "check" && !isEditable) {
        const nextWordIndex = checkQuery.data?.segments.find(
          (segment) =>
            segment.hidden &&
            segment.wordIndex !== null &&
            !revealedWordIndexes.includes(segment.wordIndex)
        )?.wordIndex;
        if (nextWordIndex !== undefined && nextWordIndex !== null) {
          event.preventDefault();
          setRevealedWordIndexes((current) => [...current, nextWordIndex]);
        }
        return;
      }

      if (event.key === "Enter" && mode === "dictation") {
        event.preventDefault();
        onSubmit();
        return;
      }

      if (
        event.key === "Enter" &&
        !isEditable &&
        setQuery.data &&
        index < setQuery.data.items.length - 1
      ) {
        event.preventDefault();
        setIndex((current) => current + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checkQuery.data?.segments, index, mode, onSubmit, revealedWordIndexes, setQuery.data]);

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
  const activeLesson =
    lessons.find((lesson) => lesson.items.some((entry) => entry.id === item.id)) ??
    lessons[0];
  const activeLessonQuestionIndex = Math.max(
    0,
    activeLesson?.items.findIndex((entry) => entry.id === item.id) ?? 0
  );

  return (
    <FeedWrapper>
      <div className="bg-background min-h-dvh">
        <header className="bg-background border-b">
          <div className="relative mx-auto flex max-w-[1280px] items-center justify-center px-4 py-3 sm:px-6">
            <Link
              href="/learn/cert/toeic/listening?mode=dictation"
              className="text-muted-foreground absolute left-4 inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600 sm:left-6"
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
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === modeOption.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
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
              {mode !== "full" && (
                <>
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
                </>
              )}

              {mode === "full" ? (
                <div className="mt-6">
                  <ToeicDictationFullPlayer
                    src={audioUrl}
                    current={activeLessonQuestionIndex + 1}
                    total={activeLesson?.items.length ?? 0}
                    questions={(activeLesson?.items ?? []).map((lessonItem, itemIndex) => ({
                      id: lessonItem.id,
                      label: String(itemIndex + 1),
                    }))}
                    activeQuestionId={item.id}
                    transcript={fullQuery.data?.transcript}
                    translationVi={fullQuery.data?.translationVi}
                    isContentLoading={fullQuery.isLoading}
                    hasPrevious={index > 0}
                    hasNext={index < setQuery.data.items.length - 1}
                    onPrevious={() =>
                      setIndex((current) => Math.max(0, current - 1))
                    }
                    onNext={() =>
                      setIndex((current) =>
                        Math.min(setQuery.data.items.length - 1, current + 1)
                      )
                    }
                    onSelectQuestion={(questionId) => {
                      const nextIndex = setQuery.data.items.findIndex(
                        (entry) => entry.id === questionId
                      );
                      if (nextIndex >= 0) setIndex(nextIndex);
                    }}
                  />
                </div>
              ) : (
              <div className="bg-card mt-6 rounded-2xl border p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setIndex((current) => Math.max(0, current - 1))}
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
                {audioUrl ? (
                  <div className="mt-5">
                    <CompactAudioPlayer
                      ref={audioPlayerRef}
                      src={audioUrl}
                      playLabel={t("play")}
                      pauseLabel={t("pause")}
                      progressLabel={t("audioProgress")}
                      volumeLabel={t("volume")}
                      volumeProgressLabel={t("volumeProgress")}
                      replayLabel={t("replay")}
                      replayCountLabel={t("replayCount")}
                      replayDelayLabel={t("replayDelay")}
                      replayApplyLabel={t("replayApply")}
                      replayTimesSuffix={t("replayTimesSuffix")}
                      replaySecondsSuffix={t("replaySecondsSuffix")}
                      autoPlay
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-5 rounded-xl border border-dashed p-4 text-sm">
                    {mediaQuery.isLoading
                      ? t("checking")
                      : t("audioUnavailable")}
                  </p>
                )}
                {mode === "check" ? (
                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="bg-background mb-4 inline-flex w-fit items-center gap-1 rounded-md p-1 text-xs font-semibold">
                      {[30, 50, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setHidePercent(value as 30 | 50 | 100);
                            setResult(null);
                            setHintCount(0);
                            setRevealedWordIndexes([]);
                            setRevealedCount(0);
                          }}
                          className={`rounded-md px-2.5 py-1.5 transition-colors ${hidePercent === value ? "bg-slate-800 text-white" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-1 font-mono text-base leading-10"
                      aria-label={t("placeholder")}
                    >
                      {(result
                        ? checkFeedback
                        : checkSegments
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
                              className="mx-1 inline-flex min-h-9 items-center rounded bg-emerald-100 px-2 text-sm font-medium text-emerald-700"
                            >
                              {segment.text}
                            </span>
                          );
                        }

                        if (!result) {
                          return (
                            <button
                              key={segment.segmentIndex}
                              type="button"
                              aria-label={t("checkWord", {
                                number: (segment.wordIndex ?? 0) + 1,
                              })}
                              disabled={segment.wordIndex === null}
                              onClick={() => {
                                if (segment.wordIndex === null) return;
                                setRevealedWordIndexes((current) =>
                                  current.includes(segment.wordIndex!)
                                    ? current
                                    : [...current, segment.wordIndex!]
                                );
                              }}
                              className="mx-1 inline-flex h-9 w-16 items-center justify-center rounded border-0 bg-slate-200 text-sm shadow-none transition-colors hover:bg-slate-300 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700"
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
                            className={`mx-1 inline-flex min-h-9 items-center rounded px-2 text-sm font-medium ${isRevealed ? (feedback?.status === "CORRECT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-muted text-muted-foreground"}`}
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
                          className={`inline-flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold ${result ? (revealedCount === count ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-muted-foreground hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent") : hintCount === count ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-muted-foreground hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent"}`}
                        >
                          <Eye
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {t("revealWords", { count })}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (result) setRevealedCount(result.words.length);
                          else setHintCount("all");
                        }}
                        className={`inline-flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold ${result ? (revealedCount >= result.words.length ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-muted-foreground hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent") : hintCount === "all" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-muted-foreground hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent"}`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("revealAll")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResult(null);
                          setHintCount(0);
                          setRevealedWordIndexes([]);
                          setRevealedCount(0);
                        }}
                        className="text-muted-foreground hover:bg-sky-50 hover:text-sky-700 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("reset")}
                      </button>
                    </div>
                    <p className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs">
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">
                        {t("keyboardCtrl")}
                      </kbd>
                      <span>{t("keyboardReplay")}</span>
                      <span aria-hidden="true">·</span>
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">
                        {t("keyboardTab")}
                      </kbd>
                      <span>{t("keyboardReveal")}</span>
                      <span aria-hidden="true">·</span>
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">
                        {t("keyboardEnter")}
                      </kbd>
                      <span>{t("keyboardNext")}</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {t("hideWords")}
                      </span>
                      <div className="inline-flex rounded-md bg-background p-1 text-xs font-semibold shadow-sm">
                        {[30, 50, 100].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setHidePercent(value as 30 | 50 | 100);
                              setTypedText("");
                              setTypedWords({});
                              setResult(null);
                              appliedDictationHintIndexesRef.current.clear();
                            }}
                            className={`rounded px-2.5 py-1.5 transition-colors ${hidePercent === value ? "bg-slate-800 text-white" : "text-muted-foreground hover:bg-muted"}`}
                          >
                            {value}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {hidePercent === 100 ? (
                      <>
                        <textarea
                          autoFocus={!result}
                          value={typedText}
                          onChange={(event) => {
                            setTypedText(event.target.value);
                            if (result) setResult(null);
                          }}
                          rows={4}
                          maxLength={5000}
                          placeholder={t("placeholder")}
                          className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm outline-none transition-colors focus:border-sky-500 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {result?.wordsCorrect ?? revealedDictationHintCount}/{dictationHiddenWordIndexes.length} {t("wordsCorrectProgress")}
                            {!result && revealedDictationHintCount > 0 && (
                              <span className="ml-2 text-amber-600">
                                ({t("hintsUsed", { count: revealedDictationHintCount })})
                              </span>
                            )}
                          </span>
                          <span>
                            {result?.accuracy ??
                              Math.round(
                                (revealedDictationHintCount /
                                  Math.max(dictationHiddenWordIndexes.length, 1)) *
                                  100
                              )}
                            %
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-3 font-mono text-sm dark:bg-slate-800/70">
                          {dictationSegments.map((segment) => (
                            <span
                              key={segment.segmentIndex}
                              className={`rounded px-2 py-1 ${result && segment.wordIndex !== null ? "bg-rose-100 text-rose-700" : segment.hidden && segment.text !== null ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                            >
                              {segment.wordIndex === null
                                ? segment.text
                                : (result?.words[segment.wordIndex]?.expected ?? segment.text ?? "·".repeat(segment.length ?? 5))}
                            </span>
                          ))}
                        </div>
                        {result && (
                          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-600">
                            <X className="h-4 w-4" aria-hidden="true" />
                            {t("accuracy", { accuracy: result.accuracy })}
                          </p>
                        )}
                      </>
                    ) : checkQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">
                        {t("checking")}
                      </p>
                    ) : (
                      <div
                        className="flex flex-wrap items-center gap-y-3 rounded-xl bg-slate-100 px-4 py-5 font-mono text-sm leading-8 dark:bg-slate-800/70"
                        aria-label={t("placeholder")}
                      >
                        {dictationSegments.map((segment) => {
                          if (!segment.hidden) {
                            return (
                              <span key={segment.segmentIndex} className="whitespace-pre-wrap">
                                {segment.text}
                              </span>
                            );
                          }

                          if (segment.wordIndex === null) return null;
                          const feedback = result?.words[segment.wordIndex];
                          if (result && feedback?.status !== "CORRECT") {
                            return (
                              <span key={segment.segmentIndex} className="mx-1 inline-flex items-center gap-1">
                                <span className="rounded border-b-2 border-rose-400 bg-rose-50 px-2 py-0.5 text-rose-700 line-through">
                                  {typedWords[segment.wordIndex] || "·····"}
                                </span>
                                <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">
                                  {feedback?.expected ?? "â€”"}
                                </span>
                              </span>
                            );
                          }
                          if (result && feedback?.status === "CORRECT") {
                            return (
                              <span
                                key={segment.segmentIndex}
                                className="mx-1 inline-flex h-9 items-center rounded border-b-2 border-emerald-400 bg-emerald-50 px-2 font-mono text-sm text-emerald-800"
                              >
                                {feedback.expected}
                              </span>
                            );
                          }
                          const feedbackClass =
                            feedback?.status === "CORRECT"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : feedback
                                ? "border-rose-400 bg-rose-50 text-rose-800"
                                : "border-sky-400 bg-slate-100";
                          return (
                            <input
                              key={`${hidePercent}-${segment.segmentIndex}`}
                              data-word-index={segment.wordIndex}
                              autoFocus={
                                !result &&
                                segment.wordIndex === dictationHiddenWordIndexes[0]
                              }
                              value={typedWords[segment.wordIndex] ?? segment.text ?? ""}
                              onChange={(event) => {
                                setTypedWords((current) => ({
                                  ...current,
                                  [segment.wordIndex!]: event.target.value,
                                }));
                                if (result) setResult(null);
                              }}
                              disabled={submit.isPending}
                              placeholder={"·".repeat(segment.length ?? 5)}
                              aria-label={t("checkWord", {
                                number: segment.wordIndex + 1,
                              })}
                              className={`mx-1 h-9 w-20 rounded border-b-2 px-2 text-center font-mono text-sm outline-none transition-colors focus:border-sky-500 focus:bg-sky-50 focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed ${feedbackClass}`}
                              style={{
                                width: `${Math.max(48, Math.min(160, (segment.length ?? 5) * 11 + 20))}px`,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {result && hidePercent !== 100 && (
                      <p className={`mt-4 flex items-center gap-2 text-sm font-medium ${result.mastered ? "text-emerald-600" : "text-rose-600"}`}>
                        {result.mastered ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <X className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t("correctWords", {
                          correct: result.wordsCorrect,
                          total: result.totalWords,
                        })} ({result.accuracy}%)
                      </p>
                    )}
                    {result?.translationVi && (
                      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                        <p className="font-semibold">{t("meaning")}</p>
                        <p className="mt-1 leading-6">{result.translationVi}</p>
                      </div>
                    )}
                    <p className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs">
                      {result ? (
                        <>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">{t("keyboardEnter")}</kbd>
                          <span>{t("keyboardNext")}</span>
                        </>
                      ) : (
                        <>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">{t("keyboardCtrl")}</kbd>
                          <span>{t("keyboardReplay")}</span>
                          <span aria-hidden="true">·</span>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">{t("keyboardTab")}</kbd>
                          <span>{t("keyboardReveal")}</span>
                          <span aria-hidden="true">·</span>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm">{t("keyboardEnter")}</kbd>
                          <span>{t("keyboardCheck")}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}
                {submit.isError && (
                  <p className="mt-3 text-sm text-rose-600">
                    {t("submitError")}
                  </p>
                )}
              </div>
              )}
              {mode !== "full" && (
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
              )}
            </div>
          </section>
        </main>
      </div>
    </FeedWrapper>
  );
}
