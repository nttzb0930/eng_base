"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Volume2 } from "lucide-react";
import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { practiceApi } from "@/app/features/practice/api/practice.api";
import { Button } from "@/app/components/ui/button";
import type { PracticeResultItem } from "@/app/features/practice/components/PracticeResult";
import { withLocale } from "@/app/i18n/paths";
import { cn } from "@/app/utils/cn";
import { useExitModal } from "@/app/features/lessons/store/exit-modal.store";
import type { VocabularyItem } from "@repo/shared";
import { vocabularyApi, type FlashcardRating } from "@/app/features/vocabulary/api/vocabulary.api";

type FlashcardSessionProps = {
  initialItems: VocabularyItem[];
  deckTitle: string;
};

type RatingConfig = {
  rating: FlashcardRating;
};

const HORIZONTAL_THRESHOLD = 90;

const ratingConfigs: RatingConfig[] = [
  {
    rating: "again",
  },
  {
    rating: "good",
  },
];

const getExamples = (item: VocabularyItem) => {
  const examples =
    item.vocabularyExamples.length > 0
      ? item.vocabularyExamples.map((example) => example.exampleEn)
      : item.exampleEn
        ? [item.exampleEn]
        : [];

  return examples.slice(0, 2);
};

const getSwipeRating = (deltaX: number) => {
  const absX = Math.abs(deltaX);

  if (absX > HORIZONTAL_THRESHOLD) {
    return deltaX < 0 ? "again" : "good";
  }

  return null;
};

const getSwipeOverlayClassName = (rating: FlashcardRating | null) => {
  if (rating === "again") return "text-rose-500";
  if (rating === "good") return "text-green-500";
  return "text-green-500";
};

export const FlashcardSession = ({
  initialItems,
  deckTitle,
}: FlashcardSessionProps) => {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const { width, height } = useWindowSize();
  const { open: openExitModal } = useExitModal();
  const [finishAudio, , finishControls] = useAudio({
    src: "/finish.mp3",
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState<Record<FlashcardRating, number>>({
    again: 0,
    good: 0,
  });
  const [swipeRating, setSwipeRating] = useState<FlashcardRating | null>(null);
  const swipeRatingRef = useRef<FlashcardRating | null>(null);
  const didDragRef = useRef(false);
  const sessionSavedRef = useRef(false);
  const [reviewedItems, setReviewedItems] = useState<PracticeResultItem[]>([]);
  const [{ x, y, rotate, scale }, springApi] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    config: {
      tension: 420,
      friction: 30,
    },
  }));

  const item = initialItems[activeIndex];
  const percentage = useMemo(() => {
    return (activeIndex / initialItems.length) * 100;
  }, [activeIndex, initialItems.length]);

  useEffect(() => {
    if (!item && reviewedItems.length > 0) {
      void finishControls.play();
    }
  }, [item, reviewedItems.length, finishControls]);

  const onPlayAudio = () => {
    if (!item?.audioUrl) return;

    const audio = new Audio(item.audioUrl);
    void audio.play().catch(() => toast.error(t("playAudioError")));
  };

  const onNextCard = useCallback(() => {
    setActiveIndex((current) => current + 1);
    setFlipped(false);
    setSwipeRating(null);
    swipeRatingRef.current = null;
    didDragRef.current = false;
    springApi.start({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      immediate: true,
    });
  }, [springApi]);

  const onRate = useCallback((rating: FlashcardRating) => {
    if (!item || pending) return;

    startTransition(() => {
      vocabularyApi.recordFlashcard(item.id, rating)
        .then(() => {
          setReviewedItems((current) => [
            ...current,
            {
              vocabularyItemId: item.id,
              word: item.word,
              meaning: item.primaryMeaningVi,
              cefrLevel: item.cefrLevel,
              correct: rating === "good",
              challengeType: "FLASHCARD",
              answer: rating,
            },
          ]);
          setCounts((current) => ({
            ...current,
            [rating]: current[rating] + 1,
          }));
          onNextCard();
        })
        .catch(() => toast.error(t("saveProgressError")));
    });
  }, [item, onNextCard, pending, t]);

  useEffect(() => {
    if (item || reviewedItems.length === 0 || sessionSavedRef.current) {
      return;
    }

    sessionSavedRef.current = true;
    practiceApi.recordSession({
      mode: "flashcards",
      items: reviewedItems.map((reviewedItem) => ({
        vocabularyItemId: reviewedItem.vocabularyItemId,
        challengeType: reviewedItem.challengeType,
        correct: reviewedItem.correct,
        answer: reviewedItem.answer,
      })),
    }).catch(() => toast.error(t("saveProgressError")));
  }, [item, reviewedItems, t]);

  const bindDrag = useDrag(
    ({ down, last, movement: [movementX] }) => {
      if (!flipped || pending) return;

      didDragRef.current = Math.abs(movementX) > 6;

      const nextSwipeRating = getSwipeRating(movementX);

      if (swipeRatingRef.current !== nextSwipeRating) {
        swipeRatingRef.current = nextSwipeRating;
        setSwipeRating(nextSwipeRating);
      }

      if (last) {
        setSwipeRating(null);
        swipeRatingRef.current = null;

        if (nextSwipeRating) {
          const exitX = nextSwipeRating === "again" ? -420 : 420;

          springApi.start({
            x: exitX,
            y: 0,
            rotate: exitX / 22,
            scale: 0.96,
            immediate: false,
          });
          onRate(nextSwipeRating);
          return;
        }

        springApi.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          immediate: false,
        });
        return;
      }

      springApi.start({
        x: movementX,
        y: 0,
        rotate: movementX / 18,
        scale: down ? 1.03 : 1,
        immediate: down,
      });
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: {
        touch: true,
      },
    }
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!item || pending) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((current) => !current);
      }

      if (!flipped) return;

      if (event.key === "ArrowLeft") onRate("again");
      if (event.key === "ArrowRight") onRate("good");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipped, item, onRate, pending]);

  if (initialItems.length === 0) {
    return (
      <>
        {finishAudio}
        <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center">
          <Image
            src="/mascot.svg"
            alt={t("mascotAlt")}
            width={96}
            height={96}
          />
          <h1 className="text-xl font-semibold text-foreground">
            {t("emptyTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href={withLocale("/flashcards")}>{t("backToFlashcards")}</Link>
          </Button>
        </div>
      </>
    );
  }

  if (!item) {
    const reviewedCount = counts.again + counts.good;

    return (
      <>
        {finishAudio}
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-5 px-6 text-center">
          <Image src="/finish.svg" alt={t("finishAlt")} height={100} width={100} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {t("complete")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground lg:text-3xl tracking-tight">
              {deckTitle}
            </h1>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {ratingConfigs.map((config) => (
              <div
                key={config.rating}
                className="rounded-xl border border-border/80 bg-card p-4 text-center shadow-xs"
              >
                <p className="text-2xl font-semibold text-foreground">
                  {counts[config.rating]}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t(config.rating)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-muted-foreground">
            {t("reviewedCards", { count: reviewedCount })}
          </p>

          <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm font-medium leading-relaxed text-emerald-700 dark:text-emerald-400">
            {t("scheduleUpdated")}
          </p>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.refresh()}
            >
              {t("reviewAgain")}
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={withLocale("/flashcards")}>{t("backToDecks")}</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const examples = getExamples(item);
  return (
    <>
      {finishAudio}
      <header className="flex items-center justify-between border-b border-border/80 px-6 py-4 lg:px-10 bg-background/95 backdrop-blur-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openExitModal("/flashcards")}
        >
          {t("exit")}
        </Button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted mx-4">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {activeIndex + 1}/{initialItems.length}
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {deckTitle}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-foreground tracking-tight">
              {flipped ? t("rememberQuestion") : t("tapToReveal")}
            </h1>
          </div>

          <animated.div
            {...bindDrag()}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }

              setFlipped((current) => !current);
            }}
            className={cn(
              "relative flex min-h-[380px] w-full touch-none select-none flex-col justify-center rounded-2xl border bg-card p-8 text-center shadow-sm transition-all duration-200",
              flipped
                ? "border-emerald-500/80 shadow-md"
                : "border-border/80 hover:border-emerald-500/40 hover:shadow-md"
            )}
            style={{
              x,
              y,
              rotate,
              scale,
            }}
          >
            {swipeRating && (
              <div
                className={cn(
                  "absolute inset-4 flex items-center justify-center rounded-xl border-2 border-dashed border-current bg-background/90 text-2xl font-semibold uppercase tracking-wider backdrop-blur-xs",
                  getSwipeOverlayClassName(swipeRating)
                )}
              >
                {t(swipeRating)}
              </div>
            )}

            {!flipped ? (
              <div className="space-y-5">
                <p className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
                  {item.word}
                </p>
                {item.phonetic && (
                  <p className="text-lg font-medium text-muted-foreground">
                    {item.phonetic}
                  </p>
                )}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={!item.audioUrl}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPlayAudio();
                    }}
                    className="h-14 w-14 rounded-full p-0 shadow-xs hover:scale-105 transition-transform"
                    aria-label={t("playPronunciation")}
                    title={t("playPronunciation")}
                  >
                    <Volume2 className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-left">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-semibold text-foreground tracking-tight">
                      {item.word}
                    </h2>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground border border-border/50">
                      {item.cefrLevel}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground border border-border/50">
                      {item.pos}
                    </span>
                  </div>
                  {item.phonetic && (
                    <p className="mt-1.5 text-base font-medium text-muted-foreground">
                      {item.phonetic}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t("meaning")}
                  </p>
                  <p className="mt-1 text-lg font-medium leading-relaxed text-foreground">
                    {item.meaningVi}
                  </p>
                </div>

                {examples.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {t("examples")}
                    </p>
                    <div className="mt-2 space-y-2">
                      {examples.map((example) => (
                        <p
                          key={example}
                          className="rounded-xl bg-muted/50 border border-border/40 p-3.5 text-sm font-medium leading-relaxed text-foreground"
                        >
                          {example}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </animated.div>

          {!flipped ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setFlipped(true)}
              className="w-full sm:w-auto px-8 font-semibold shadow-xs"
            >
              {t("showAnswer")}
            </Button>
          ) : (
            <div className="grid w-full grid-cols-2 gap-3.5 sm:max-w-md">
              <Button
                variant="dangerOutline"
                size="lg"
                onClick={() => onRate("again")}
                disabled={pending}
                className="w-full font-semibold"
              >
                {t("again")}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => onRate("good")}
                disabled={pending}
                className="w-full font-semibold shadow-xs"
              >
                {t("good")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
