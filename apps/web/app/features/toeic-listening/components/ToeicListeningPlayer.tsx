"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";

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

  const replayable = canReplayToeicListeningMedia(state, mediaId, mode);
  return (
    <div className="bg-muted/60 rounded-xl p-4">
      <audio
        ref={audioRef}
        controls={canSeekToeicListeningMedia(mode)}
        aria-label={t("audioLabel")}
        className={mode === "PRACTICE" ? "w-full" : "sr-only"}
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
          const positionMs = event.currentTarget.currentTime * 1000;
          if (positionMs - lastCheckpointRef.current < 5000) return;
          lastCheckpointRef.current = positionMs;
          onCheckpoint?.({ ...state, positionMs });
        }}
        onSeeked={(event) => {
          if (!canSeekToeicListeningMedia(mode)) return;
          const next = reduceToeicListeningPlayback(
            state,
            {
              type: "SEEK",
              mediaId,
              positionMs: event.currentTarget.currentTime * 1000,
            },
            mode
          );
          update(next, true);
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

      {mode === "PRACTICE" && state.status === "ERROR" ? (
        <Button
          type="button"
          onClick={() => {
            if (autoStart) {
              void loadAndPlay("RETRY");
              return;
            }
            setPracticeLoadAttempt((attempt) => attempt + 1);
          }}
          className="mt-3 gap-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      ) : null}

      {mode === "FULL" ? (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          </span>
          {state.status === "PLAYING" ? (
            <Button type="button" onClick={pause} className="gap-2">
              <Pause className="h-4 w-4" aria-hidden="true" />
              {t("pause")}
            </Button>
          ) : state.status === "ERROR" ? (
            <Button
              type="button"
              onClick={() => void loadAndPlay("RETRY")}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("retry")}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!replayable || state.status === "LOADING"}
              onClick={() =>
                void loadAndPlay(state.status === "PAUSED" ? "RESUME" : "START")
              }
              className="gap-2"
            >
              {state.status === "LOADING" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {state.status === "PAUSED" ? t("resume") : t("play")}
            </Button>
          )}
          <span className="text-muted-foreground text-xs font-semibold">
            {state.status === "ENDED" ? t("completed") : t("fullPolicy")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
