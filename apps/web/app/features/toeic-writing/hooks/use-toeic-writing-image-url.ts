"use client";

import { useEffect, useState } from "react";

import { toeicWritingApi } from "../api/toeic-writing.api";

export function useToeicWritingImageUrl(taskId: number) {
  const [state, setState] = useState<{
    taskId: number | null;
    url: string | null;
    error: boolean;
  }>({ taskId: null, url: null, error: false });

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
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
  }, [taskId]);

  return {
    url: state.taskId === taskId ? state.url : null,
    error: state.taskId === taskId && state.error,
    loading: state.taskId !== taskId,
  };
}
