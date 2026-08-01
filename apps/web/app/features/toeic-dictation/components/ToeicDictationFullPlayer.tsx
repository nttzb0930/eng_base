"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { PlaybackSpeedSelect } from "@/app/features/toeic-dictation/components/PlaybackSpeedSelect";
import type { ToeicDictationPlaybackSpeed } from "@/app/features/toeic-dictation/playback-speed";

export type ToeicDictationFullQuestion = {
  id: number;
  label: string;
};

type Props = {
  src: string | null;
  current: number;
  total: number;
  questions: ToeicDictationFullQuestion[];
  activeQuestionId: number;
  transcript?: string;
  translationVi?: string | null;
  isContentLoading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelectQuestion: (questionId: number) => void;
};

export function ToeicDictationFullPlayer({
  src,
  current,
  total,
  questions,
  activeQuestionId,
  transcript,
  translationVi,
  isContentLoading,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onSelectQuestion,
}: Props) {
  const t = useTranslations("toeicDictation.session");
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplayRef = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [showScript, setShowScript] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<ToeicDictationPlaybackSpeed>(1);

  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncPlayback = () => setPlaying(!audio.paused);
    audio.addEventListener("play", syncPlayback);
    audio.addEventListener("pause", syncPlayback);
    audio.addEventListener("ended", syncPlayback);
    return () => {
      audio.removeEventListener("play", syncPlayback);
      audio.removeEventListener("pause", syncPlayback);
      audio.removeEventListener("ended", syncPlayback);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    if (!src || !autoplayRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      void audio.play().catch(() => setPlaying(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [src]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      void audio.play().catch(() => setPlaying(false));
      return;
    }
    audio.pause();
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setPlaying(false));
  };

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-md border p-6 shadow-sm sm:p-8">
        <audio ref={audioRef} src={src ?? undefined} preload="metadata" className="sr-only" />
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-md"
            disabled={!hasPrevious}
            onClick={onPrevious}
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full"
            disabled={!src}
            onClick={togglePlayback}
            aria-label={playing ? t("pause") : t("play")}
          >
            {playing ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-md"
            disabled={!hasNext}
            onClick={onNext}
            aria-label={t("next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="text-muted-foreground mt-5 text-center text-sm font-medium tabular-nums">
          {t("question", { current, total })}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
          <Button
            type="button"
            variant="ghost"
            className="rounded-md px-3"
            disabled={!src}
            onClick={restart}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("restartFromStart")}
          </Button>
          <Button
            type="button"
            variant={autoplay ? "secondary" : "ghost"}
            className="rounded-md px-3"
            onClick={() => setAutoplay((value) => !value)}
            aria-pressed={autoplay}
          >
            {t("autoplay", { state: autoplay ? t("enabled") : t("disabled") })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-md px-3"
            onClick={() => setShowScript((value) => !value)}
            aria-pressed={showScript}
          >
            {showScript ? (
              <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {showScript ? t("hideScript") : t("showScript")}
          </Button>
          <PlaybackSpeedSelect
            value={playbackSpeed}
            onValueChange={setPlaybackSpeed}
          />
        </div>
      </section>

      {showScript && (
        <section className="bg-card rounded-md border p-6 shadow-sm sm:p-8">
          {isContentLoading ? (
            <p className="text-muted-foreground text-sm">{t("checking")}</p>
          ) : transcript ? (
            <>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t("transcript")}
              </p>
              <p className="mt-3 text-base leading-7">{transcript}</p>
              {translationVi && (
                <>
                  <p className="text-muted-foreground mt-6 text-xs font-semibold uppercase tracking-wide">
                    {t("translation")}
                  </p>
                  <p className="text-muted-foreground mt-3 text-sm leading-6 italic">
                    {translationVi}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("audioUnavailable")}</p>
          )}
        </section>
      )}

      <section className="bg-card rounded-md border p-4 shadow-sm sm:p-5">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {t("questionList")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {questions.map((question) => {
            const selected = question.id === activeQuestionId;
            return (
              <Button
                key={question.id}
                type="button"
                size="icon"
                variant={selected ? "default" : "secondary"}
                className="h-9 w-9 rounded-md text-sm"
                onClick={() => onSelectQuestion(question.id)}
                aria-current={selected ? "step" : undefined}
                aria-label={t("goToQuestion", { number: question.label })}
              >
                {question.label}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
