"use client";

import {
  ChevronDown,
  Pause,
  Play,
  Repeat2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

type Props = {
  src: string;
  playLabel: string;
  pauseLabel: string;
  restartLabel: string;
  progressLabel: string;
  volumeLabel: string;
  volumeProgressLabel: string;
  replayLabel: string;
  replayCountLabel: string;
  replayDelayLabel: string;
  replayApplyLabel: string;
  replayTimesSuffix: string;
  replaySecondsSuffix: string;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CompactAudioPlayer({
  src,
  playLabel,
  pauseLabel,
  restartLabel,
  progressLabel,
  volumeLabel,
  volumeProgressLabel,
  replayLabel,
  replayCountLabel,
  replayDelayLabel,
  replayApplyLabel,
  replayTimesSuffix,
  replaySecondsSuffix,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayRemainingRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayCount, setReplayCount] = useState(3);
  const [replayDelay, setReplayDelay] = useState(1);
  const [draftReplayCount, setDraftReplayCount] = useState(3);
  const [draftReplayDelay, setDraftReplayDelay] = useState(1);

  const clearReplayTimer = () => {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncDuration = () => setDuration(audio.duration);
    const syncPlaying = () => setPlaying(!audio.paused);
    const handleEnded = () => {
      if (replayRemainingRef.current <= 0) {
        setPlaying(false);
        return;
      }

      replayRemainingRef.current -= 1;
      replayTimerRef.current = setTimeout(() => {
        replayTimerRef.current = null;
        audio.currentTime = 0;
        setCurrentTime(0);
        void audio.play().catch(() => setPlaying(false));
      }, replayDelay * 1000);
    };

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("play", syncPlaying);
    audio.addEventListener("pause", syncPlaying);
    audio.addEventListener("ended", handleEnded);
    return () => {
      clearReplayTimer();
      replayRemainingRef.current = 0;
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("play", syncPlaying);
      audio.removeEventListener("pause", syncPlaying);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [replayDelay, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    clearReplayTimer();
    replayRemainingRef.current = 0;
    audio.currentTime = 0;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setMuted(false);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      clearReplayTimer();
      replayRemainingRef.current = 0;
      audio.pause();
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    clearReplayTimer();
    replayRemainingRef.current = replayCount;
    audio.currentTime = 0;
    setCurrentTime(0);
    void audio.play().catch(() => setPlaying(false));
  };

  const applyReplaySettings = () => {
    setReplayCount(draftReplayCount);
    setReplayDelay(draftReplayDelay);
    setReplayOpen(false);
  };

  const volumePercent = Math.round((muted ? 0 : volume) * 100);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-muted/50 flex w-full max-w-[460px] items-center gap-2 rounded-md border px-2.5 py-2 shadow-sm">
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          className="sr-only"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              aria-label={playing ? pauseLabel : playLabel}
              className="h-9 w-9 shrink-0 rounded-md"
            >
              {playing ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{playing ? pauseLabel : playLabel}</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground w-[72px] shrink-0 text-center text-xs tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <Slider
          value={[currentTime]}
          max={Math.max(duration, 0.1)}
          step={0.01}
          onValueChange={([value]) => {
            const audio = audioRef.current;
            if (audio && value !== undefined) {
              audio.currentTime = value;
              setCurrentTime(value);
            }
          }}
          aria-label={progressLabel}
          className="min-w-0 flex-1"
        />
        <div className="group/volume relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const audio = audioRef.current;
              const nextMuted = !muted;
              if (audio) {
                audio.muted = nextMuted;
                if (!nextMuted && volume === 0) audio.volume = 1;
              }
              if (!nextMuted && volume === 0) setVolume(1);
              setMuted(nextMuted);
            }}
            aria-label={volumeLabel}
            title={volumeLabel}
            className="h-9 w-9 rounded-md"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <div className="bg-card absolute bottom-full right-0 z-20 hidden w-14 rounded-md border p-3 shadow-lg group-focus-within/volume:block group-hover/volume:block">
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-muted-foreground text-[11px] font-medium tabular-nums"
                aria-live="polite"
              >
                {volumePercent}%
              </span>
              {muted ? (
                <VolumeX
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Volume2
                  className="text-muted-foreground h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <Slider
                value={[muted ? 0 : volume]}
                max={1}
                step={0.05}
                orientation="vertical"
                onValueChange={([value]) => {
                  if (value === undefined) return;
                  setVolume(value);
                  setMuted(value === 0);
                }}
                aria-label={volumeProgressLabel}
                aria-valuetext={`${volumePercent}%`}
                className="h-24 w-5"
              />
            </div>
          </div>
        </div>
        <div className="group/replay relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setReplayOpen((open) => !open)}
            aria-label={replayLabel}
            aria-expanded={replayOpen}
            title={replayLabel}
            className="h-9 w-9 rounded-md"
          >
            <Repeat2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          {replayOpen && (
            <div className="bg-card absolute right-0 top-full z-30 mt-2 w-64 rounded-md border p-3 shadow-lg">
              <div className="space-y-3">
                <label className="text-muted-foreground block text-xs font-medium">
                  {replayCountLabel}
                  <span className="relative mt-1 block">
                    <select
                      value={draftReplayCount}
                      onChange={(event) =>
                        setDraftReplayCount(Number(event.target.value))
                      }
                      className="bg-background focus-visible:ring-ring h-9 w-full appearance-none rounded-md border px-3 pr-8 text-sm text-foreground outline-none focus-visible:ring-2"
                    >
                      {[1, 3, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} {replayTimesSuffix}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  </span>
                </label>
                <label className="text-muted-foreground block text-xs font-medium">
                  {replayDelayLabel}
                  <span className="relative mt-1 block">
                    <select
                      value={draftReplayDelay}
                      onChange={(event) =>
                        setDraftReplayDelay(Number(event.target.value))
                      }
                      className="bg-background focus-visible:ring-ring h-9 w-full appearance-none rounded-md border px-3 pr-8 text-sm text-foreground outline-none focus-visible:ring-2"
                    >
                      {[0, 1, 2].map((value) => (
                        <option key={value} value={value}>
                          {value} {replaySecondsSuffix}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  </span>
                </label>
                <Button
                  type="button"
                  className="h-9 w-full rounded-md"
                  onClick={applyReplaySettings}
                >
                  {replayApplyLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full rounded-md"
                  onClick={() => {
                    setReplayOpen(false);
                    restart();
                  }}
                >
                  {restartLabel}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
