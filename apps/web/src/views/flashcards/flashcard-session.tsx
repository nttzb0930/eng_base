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
import { LocalizedLink as Link } from "@/src/components/localized-link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Confetti from "react-confetti";
import { useAudio, useWindowSize } from "react-use";
import { toast } from "sonner";

import { recordFlashcardRating } from "@/src/services/vocabulary/flashcard-progress.service";
import { recordPracticeSessionResult } from "@/src/services/practice/practice-sessions.service";
import { Button } from "@/src/components/ui/button";
import type { PracticeResultItem } from "@/src/views/practice/practice-result";
import { withLocale } from "@/src/lib/i18n/paths";
import { useCurrentLocale } from "@/src/lib/i18n/use-current-locale";
import { cn } from "@/src/lib/utils";
import type { VocabularyItem } from "@/src/modules/learning/queries";
import type { FlashcardRating } from "@/src/modules/vocabulary/progress";

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
  const locale = useCurrentLocale();
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
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
      recordFlashcardRating(item.id, rating)
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
    recordPracticeSessionResult({
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
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-y-5 px-6 text-center">
        <Image
          src="/mascot.svg"
          alt={t("mascotAlt")}
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold text-neutral-700">
          {t("emptyTitle")}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <Button asChild variant="primary" size="lg">
          <Link href={withLocale("/flashcards")}>{t("backToFlashcards")}</Link>
        </Button>
      </div>
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
            <p className="text-sm font-black uppercase tracking-wide text-green-500">
              {t("complete")}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-neutral-700 lg:text-3xl">
              {deckTitle}
            </h1>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {ratingConfigs.map((config) => (
              <div
                key={config.rating}
                className="rounded-xl border-2 bg-white p-4 text-center"
              >
                <p className="text-2xl font-black text-neutral-800">
                  {counts[config.rating]}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">
                  {t(config.rating)}
                </p>
              </div>
            ))}
          </div>

          <p className="font-bold text-neutral-600">
            {t("reviewedCards", { count: reviewedCount })}
          </p>

          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-700">
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
      <header className="flex items-center justify-between border-b-2 px-6 py-4 lg:px-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(withLocale("/flashcards", locale))}
        >
          {t("exit")}
        </Button>
        <div className="h-4 flex-1 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="ml-4 text-sm font-bold text-neutral-500">
          {activeIndex + 1}/{initialItems.length}
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-wide text-green-500">
              {deckTitle}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-neutral-800">
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
              "relative flex min-h-[360px] w-full touch-none select-none flex-col justify-center rounded-2xl border-2 border-b-8 bg-white p-8 text-center shadow-sm",
              flipped
                ? "border-green-500"
                : "border-slate-200 hover:border-green-400"
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
                  "absolute inset-4 flex items-center justify-center rounded-xl border-4 border-dashed border-current bg-white/75 text-4xl font-black uppercase",
                  getSwipeOverlayClassName(swipeRating)
                )}
              >
                {t(swipeRating)}
              </div>
            )}

            {!flipped ? (
              <div className="space-y-5">
                <p className="text-5xl font-black text-neutral-800">
                  {item.word}
                </p>
                {item.phonetic && (
                  <p className="text-xl font-bold text-muted-foreground">
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
                    className="h-16 w-16 rounded-full p-0"
                    aria-label={t("playPronunciation")}
                    title={t("playPronunciation")}
                  >
                    <Volume2 className="h-7 w-7" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-left">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-4xl font-black text-neutral-800">
                      {item.word}
                    </h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-500">
                      {item.cefrLevel}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-500">
                      {item.pos}
                    </span>
                  </div>
                  {item.phonetic && (
                    <p className="mt-2 text-lg font-bold text-muted-foreground">
                      {item.phonetic}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-black uppercase text-green-500">
                    {t("meaning")}
                  </p>
                  <p className="mt-1 text-xl font-bold leading-8 text-neutral-800">
                    {item.meaningVi}
                  </p>
                </div>

                {examples.length > 0 && (
                  <div>
                    <p className="text-sm font-black uppercase text-sky-500">
                      {t("examples")}
                    </p>
                    <div className="mt-2 space-y-2">
                      {examples.map((example) => (
                        <p
                          key={example}
                          className="rounded-lg bg-slate-50 p-3 text-base font-semibold leading-7 text-neutral-700"
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
            >
              {t("showAnswer")}
            </Button>
          ) : null}

        </div>
      </div>
    </>
  );
};
