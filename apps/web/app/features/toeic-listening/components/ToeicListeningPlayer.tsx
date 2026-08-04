"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";
import { PlaybackSpeedSelect } from "@/app/features/toeic-dictation/components/PlaybackSpeedSelect";
import type { ToeicDictationPlaybackSpeed } from "@/app/features/toeic-dictation/playback-speed";

import { toeicListeningApi } from "../api/toeic-listening.api";
import {
  canReplayToeicListeningMedia,
  canSeekToeicListeningMedia,
  createToeicListeningPlaybackState,
  reduceToeicListeningPlayback,
  type ListeningPlaybackMode,
  type ListeningPlaybackState,
} from "../toeic-listening-playback-policy";

type ToeicListeningPlayerProps = {
  mediaId: number;
  mode: ListeningPlaybackMode;
  completedMediaIds?: number[];
  initialPositionMs?: number;
  autoStart?: boolean;
  onCheckpoint?: (state: ListeningPlaybackState) => void;
  onEnded?: () => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ToeicListeningPlayer({
  mediaId,
  mode,
  completedMediaIds = [],
  initialPositionMs = 0,
  autoStart = false,
  onCheckpoint,
  onEnded,
}: ToeicListeningPlayerProps) {
  const t = useTranslations("toeicListening.player");
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const lastCheckpointRef = useRef(0);
  const [practiceLoadAttempt, setPracticeLoadAttempt] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialPositionMs / 1000);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] =
    useState<ToeicDictationPlaybackSpeed>(1);
  const [state, setState] = useState(() =>
    createToeicListeningPlaybackState({
      activeMediaId: initialPositionMs > 0 ? mediaId : null,
      positionMs: initialPositionMs,
      completedMediaIds,
      status: initialPositionMs > 0 ? "PAUSED" : "IDLE",
    })
  );

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void loadAndPlay("START");
  });

  useEffect(() => {
    if (mode !== "PRACTICE" || autoStart || objectUrlRef.current) return;

    let cancelled = false;
    setState((current) =>
      reduceToeicListeningPlayback(current, { type: "START", mediaId }, mode)
    );

    void toeicListeningApi
      .media(mediaId)
      .then((blob) => {
        if (cancelled) return;
        const audio = audioRef.current;
        if (!audio) return;
        objectUrlRef.current = URL.createObjectURL(blob);
        audio.src = objectUrlRef.current;
        audio.load();
      })
      .catch(() => {
        if (cancelled) return;
        setState((current) =>
          reduceToeicListeningPlayback(
            current,
            { type: "ERROR", mediaId },
            mode
          )
        );
      });

    return () => {
      cancelled = true;
    };
  }, [autoStart, mediaId, mode, practiceLoadAttempt]);

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

  function update(next: ListeningPlaybackState, checkpoint = false) {
    setState(next);
    if (checkpoint) onCheckpoint?.(next);
  }

  async function loadAndPlay(action: "START" | "RESUME" | "RETRY") {
    const next = reduceToeicListeningPlayback(
      state,
      { type: action, mediaId },
      mode
    );
    if (next === state) return;
    update(next);
    try {
      const audio = audioRef.current;
      if (!audio) return;
      if (!objectUrlRef.current) {
        const blob = await toeicListeningApi.media(mediaId);
        objectUrlRef.current = URL.createObjectURL(blob);
        audio.src = objectUrlRef.current;
        audio.load();
      }
      const positionMs = next.positionMs;
      if (positionMs > 0) audio.currentTime = positionMs / 1000;
      await audio.play();
      update(
        reduceToeicListeningPlayback(next, { type: "PLAYING", mediaId }, mode)
      );
    } catch {
      update(
        reduceToeicListeningPlayback(next, { type: "ERROR", mediaId }, mode),
        true
      );
    }
  }

  function pause() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    update(
      reduceToeicListeningPlayback(
        state,
        { type: "PAUSE", mediaId, positionMs: audio.currentTime * 1000 },
        mode
      ),
      true
    );
  }

  function seek(positionSeconds: number) {
    const audio = audioRef.current;
    if (!audio || !canSeekToeicListeningMedia(mode)) return;
    audio.currentTime = positionSeconds;
    setCurrentTime(positionSeconds);
    update(
      reduceToeicListeningPlayback(
        state,
        { type: "SEEK", mediaId, positionMs: positionSeconds * 1000 },
        mode
      ),
      true
    );
  }

  const replayable = canReplayToeicListeningMedia(state, mediaId, mode);
  return (
    <div className="bg-muted/50 rounded-md border p-3 shadow-sm">
      <audio
        ref={audioRef}
        aria-label={t("audioLabel")}
        className="sr-only"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => {
          setState((current) =>
            reduceToeicListeningPlayback(
              current,
              { type: "PLAYING", mediaId },
              mode
            )
          );
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
          const positionMs = event.currentTarget.currentTime * 1000;
          if (positionMs - lastCheckpointRef.current < 5000) return;
          lastCheckpointRef.current = positionMs;
          onCheckpoint?.({ ...state, positionMs });
        }}
        onPause={() => {
          if (!audioRef.current?.ended && state.status === "PLAYING") pause();
        }}
        onEnded={() => {
          const next = reduceToeicListeningPlayback(
            state,
            { type: "ENDED", mediaId },
            mode
          );
          update(next, true);
          onEnded?.();
        }}
      />

      {state.status === "ERROR" ? (
        <Button
          type="button"
          onClick={() => {
            if (autoStart) {
              void loadAndPlay("RETRY");
              return;
            }
            setPracticeLoadAttempt((attempt) => attempt + 1);
          }}
          className="w-full gap-2 rounded-md"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      ) : null}

      {state.status !== "ERROR" ? (
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!replayable || state.status === "LOADING"}
            onClick={() =>
              state.status === "PLAYING"
                ? pause()
                : void loadAndPlay(
                    state.status === "PAUSED" ? "RESUME" : "START"
                  )
            }
            aria-label={state.status === "PLAYING" ? t("pause") : t("play")}
            className="h-9 w-9 shrink-0 rounded-md"
          >
            {state.status === "LOADING" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : state.status === "PLAYING" ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <span className="text-muted-foreground w-[72px] shrink-0 text-center text-xs tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {canSeekToeicListeningMedia(mode) ? (
            <Slider
              value={[currentTime]}
              max={Math.max(duration, 0.1)}
              step={0.01}
              onValueChange={([value]) => value !== undefined && seek(value)}
              aria-label={t("audioLabel")}
              className="min-w-0 flex-1"
            />
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {mode === "PRACTICE" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => seek(0)}
              aria-label={t("retry")}
              className="h-9 w-9 shrink-0 rounded-md"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          <PlaybackSpeedSelect
            value={playbackSpeed}
            onValueChange={setPlaybackSpeed}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMuted((current) => !current)}
            aria-label={t("audioLabel")}
            className="h-9 w-9 shrink-0 rounded-md"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      ) : null}
      {mode === "FULL" ? (
        <p className="text-muted-foreground mt-2 text-center text-xs font-semibold">
          {state.status === "ENDED" ? t("completed") : t("fullPolicy")}
        </p>
      ) : null}
    </div>
  );
}
