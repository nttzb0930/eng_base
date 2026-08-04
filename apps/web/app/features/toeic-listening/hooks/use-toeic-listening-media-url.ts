"use client";

import { useEffect, useState } from "react";

import { toeicListeningApi } from "../api/toeic-listening.api";

export function useToeicListeningMediaUrl(mediaId: number) {
  const [state, setState] = useState<{
    mediaId: number | null;
    url: string | null;
    error: boolean;
  }>({ mediaId: null, url: null, error: false });

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    void toeicListeningApi
      .media(mediaId)
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ mediaId, url: objectUrl, error: false });
      })
      .catch(() => {
        if (!disposed) setState({ mediaId, url: null, error: true });
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  return {
    url: state.mediaId === mediaId ? state.url : null,
    error: state.mediaId === mediaId && state.error,
    loading: state.mediaId !== mediaId,
  };
}
