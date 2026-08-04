"use client";

import { Pause, Play, Repeat2, Volume2, VolumeX } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/app/components/ui/button";
import { PlaybackSpeedSelect } from "@/app/features/toeic-dictation/components/PlaybackSpeedSelect";
import type { ToeicDictationPlaybackSpeed } from "@/app/features/toeic-dictation/playback-speed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
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
  progressLabel: string;
  volumeLabel: string;
  volumeProgressLabel: string;
  replayLabel: string;
  replayCountLabel: string;
  replayDelayLabel: string;
  replayApplyLabel: string;
  replayTimesSuffix: string;
  replaySecondsSuffix: string;
  autoPlay?: boolean;
  autoPlayKey?: string;
};

export type CompactAudioPlayerHandle = {
  replay: () => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const CompactAudioPlayer = forwardRef<CompactAudioPlayerHandle, Props>(
  function CompactAudioPlayer(
    {
      src,
      playLabel,
      pauseLabel,
      progressLabel,
      volumeLabel,
      volumeProgressLabel,
      replayLabel,
      replayCountLabel,
      replayDelayLabel,
      replayApplyLabel,
      replayTimesSuffix,
      replaySecondsSuffix,
      autoPlay = false,
      autoPlayKey,
    },
    ref
  ) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replayRemainingRef = useRef(0);
    const replayDelayRef = useRef(1);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] =
      useState<ToeicDictationPlaybackSpeed>(1);
    const [replayOpen, setReplayOpen] = useState(false);
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
        }, replayDelayRef.current * 1000);
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
    }, [src]);

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
    }, [src]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !autoPlay) return;
      const frame = window.requestAnimationFrame(() => {
        void audio.play().catch(() => setPlaying(false));
      });
      return () => window.cancelAnimationFrame(frame);
    }, [autoPlay, autoPlayKey, src]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = volume;
      audio.muted = muted;
    }, [muted, volume]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.playbackRate = playbackSpeed;
    }, [playbackSpeed]);

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

    const startReplay = (count: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      clearReplayTimer();
      replayRemainingRef.current = Math.max(0, count - 1);
      audio.currentTime = 0;
      setCurrentTime(0);
      void audio.play().catch(() => setPlaying(false));
    };

    const applyReplaySettings = () => {
      replayDelayRef.current = draftReplayDelay;
      setReplayOpen(false);
      startReplay(draftReplayCount);
    };

    useImperativeHandle(ref, () => ({ replay: () => startReplay(1) }), []);

    const volumePercent = Math.round((muted ? 0 : volume) * 100);

    return (
      <TooltipProvider delayDuration={300}>
        <div className="shadow-xs flex w-full max-w-[460px] items-center gap-1.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2 dark:border-emerald-900/60 dark:bg-emerald-950/20">
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
                variant="default"
                size="icon"
                onClick={togglePlayback}
                aria-label={playing ? pauseLabel : playLabel}
                className="shadow-xs h-8 w-8 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 sm:h-9 sm:w-9"
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
          <span className="text-muted-foreground shrink-0 text-center text-[11px] tabular-nums sm:text-xs">
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
            className="hidden min-w-0 flex-1 sm:flex"
          />
          <PlaybackSpeedSelect
            value={playbackSpeed}
            onValueChange={setPlaybackSpeed}
          />
          <div className="group/volume relative hidden shrink-0 sm:block">
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
              className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
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
              className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
            >
              <Repeat2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            {replayOpen && (
              <div className="bg-popover text-popover-foreground animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 origin-top-right duration-200 ease-out absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border p-4 shadow-xl">
                <div className="space-y-3">
                  <label className="text-muted-foreground block text-xs font-medium">
                    {replayCountLabel}
                    <span className="relative mt-1 block">
                      <Select
                        value={String(draftReplayCount)}
                        onValueChange={(value) =>
                          setDraftReplayCount(Number(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 3, 5].map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {value} {replayTimesSuffix}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                  </label>
                  <label className="text-muted-foreground block text-xs font-medium">
                    {replayDelayLabel}
                    <span className="relative mt-1 block">
                      <Select
                        value={String(draftReplayDelay)}
                        onValueChange={(value) =>
                          setDraftReplayDelay(Number(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0.5, 1, 1.5, 2].map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {value} {replaySecondsSuffix}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                  </label>
                  <Button
                    type="button"
                    className="h-9 w-full rounded-md"
                    onClick={applyReplaySettings}
                  >
                    {replayApplyLabel}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    );
  }
);
