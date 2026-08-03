"use client";

import { useEffect, useState } from "react";

import { toeicWritingApi } from "../api/toeic-writing.api";

export function useToeicWritingImageUrl(taskId: number, enabled = true) {
  const [state, setState] = useState<{
    taskId: number | null;
    url: string | null;
    error: boolean;
  }>({ taskId: null, url: null, error: false });

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let objectUrl: string | null = null;
    queueMicrotask(() => {
      if (!disposed) setState({ taskId, url: null, error: false });
    });
    void toeicWritingApi
      .image(taskId)
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ taskId, url: objectUrl, error: false });
      })
      .catch(() => {
        if (!disposed) setState({ taskId, url: null, error: true });
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, taskId]);

  return {
    url: enabled && state.taskId === taskId ? state.url : null,
    error: enabled && state.taskId === taskId && state.error,
    loading:
      enabled &&
      (state.taskId !== taskId || (state.url === null && !state.error)),
  };
}
