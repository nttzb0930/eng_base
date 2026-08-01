export type ListeningPlaybackMode = "PRACTICE" | "FULL";

export type ListeningPlaybackState = {
  activeMediaId: number | null;
  positionMs: number;
  completedMediaIds: number[];
  status: "IDLE" | "LOADING" | "PLAYING" | "PAUSED" | "ERROR" | "ENDED";
};

export type ListeningPlaybackAction =
  | { type: "START" | "RESUME" | "PLAYING" | "RETRY"; mediaId: number }
  | { type: "PAUSE" | "SEEK"; mediaId: number; positionMs: number }
  | { type: "ERROR" | "ENDED"; mediaId: number };

export function createToeicListeningPlaybackState(
  input: Partial<ListeningPlaybackState> = {}
): ListeningPlaybackState {
  return {
    activeMediaId: null,
    positionMs: 0,
    completedMediaIds: [],
    status: "IDLE",
    ...input,
  };
}

export function canSeekToeicListeningMedia(mode: ListeningPlaybackMode) {
  return mode === "PRACTICE";
}

export function canReplayToeicListeningMedia(
  state: ListeningPlaybackState,
  mediaId: number,
  mode: ListeningPlaybackMode
) {
  return mode === "PRACTICE" || !state.completedMediaIds.includes(mediaId);
}

export function reduceToeicListeningPlayback(
  state: ListeningPlaybackState,
  action: ListeningPlaybackAction,
  mode: ListeningPlaybackMode
): ListeningPlaybackState {
  const consumed = state.completedMediaIds.includes(action.mediaId);
  if (mode === "FULL" && consumed) return state;

  if (action.type === "START") {
    return {
      ...state,
      activeMediaId: action.mediaId,
      positionMs: mode === "PRACTICE" ? 0 : state.positionMs,
      status: "LOADING",
    };
  }
  if (action.type === "RESUME") {
    if (state.activeMediaId !== action.mediaId) return state;
    return { ...state, status: "LOADING" };
  }
  if (action.type === "PLAYING") {
    if (state.activeMediaId !== action.mediaId) return state;
    return { ...state, status: "PLAYING" };
  }
  if (action.type === "PAUSE") {
    if (state.activeMediaId !== action.mediaId) return state;
    return { ...state, positionMs: action.positionMs, status: "PAUSED" };
  }
  if (action.type === "SEEK") {
    if (mode !== "PRACTICE" || state.activeMediaId !== action.mediaId) {
      return state;
    }
    return { ...state, positionMs: Math.max(0, action.positionMs) };
  }
  if (action.type === "ERROR") {
    if (state.activeMediaId !== action.mediaId) return state;
    return { ...state, status: "ERROR" };
  }
  if (action.type === "RETRY") {
    if (state.status !== "ERROR" || state.activeMediaId !== action.mediaId) {
      return state;
    }
    return { ...state, status: "LOADING" };
  }
  if (state.activeMediaId !== action.mediaId) return state;
  return {
    activeMediaId: null,
    positionMs: 0,
    completedMediaIds: [
      ...new Set([...state.completedMediaIds, action.mediaId]),
    ].sort((left, right) => left - right),
    status: "ENDED",
  };
}
