import type {
  ToeicDictationOverview,
  ToeicDictationPart,
  ToeicDictationCheckItem,
  ToeicDictationFullItem,
  ToeicDictationProgress,
  ToeicDictationSetDetail,
  ToeicDictationSetSummary,
  ToeicDictationSubmitPayload,
  ToeicDictationSubmitResult,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

type ToeicDictationHttp = {
  get<T>(path: string, config?: { responseType?: "blob" }): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export const toeicDictationKeys = {
  all: ["toeic-dictation"] as const,
  overview: () => [...toeicDictationKeys.all, "overview"] as const,
  setsRoot: () => [...toeicDictationKeys.all, "sets"] as const,
  sets: (collection = "2026", test?: number, part?: ToeicDictationPart) =>
    [...toeicDictationKeys.setsRoot(), collection, test ?? "all", part ?? "all"] as const,
  set: (setId: number) => [...toeicDictationKeys.all, "set", setId] as const,
  progress: (setId: number) => [...toeicDictationKeys.all, "progress", setId] as const,
};

export function createToeicDictationApi(http: ToeicDictationHttp) {
  return {
    async overview() {
      return (await http.get<ToeicDictationOverview>("/toeic/dictation/overview")).data;
    },
    async sets(options: { collection?: string; test?: number; part?: ToeicDictationPart } = {}) {
      return (
        await http.get<ToeicDictationSetSummary[]>(
          withQuery("/toeic/dictation/sets", options),
        )
      ).data;
    },
    async set(setId: number) {
      return (await http.get<ToeicDictationSetDetail>(`/toeic/dictation/sets/${setId}/items`)).data;
    },
  async progress(setId: number) {
      return (await http.get<ToeicDictationProgress>(`/toeic/dictation/sets/${setId}/progress`)).data;
    },
    async checkItem(itemId: number, hidePercent: 30 | 50 | 100 = 50) {
      return (
        await http.get<ToeicDictationCheckItem>(
          `/toeic/dictation/items/${itemId}/check?hide=${hidePercent}`,
        )
      ).data;
    },
    async fullItem(itemId: number) {
      return (await http.get<ToeicDictationFullItem>(`/toeic/dictation/items/${itemId}/full`)).data;
    },
    async submit(itemId: number, body: ToeicDictationSubmitPayload) {
      return (await http.post<ToeicDictationSubmitResult>(`/toeic/dictation/items/${itemId}/submit`, body)).data;
    },
    async media(itemId: number) {
      return (await http.get<Blob>(`/toeic/dictation/media/${itemId}`, { responseType: "blob" })).data;
    },
  };
}

export const toeicDictationApi = createToeicDictationApi(webHttpClient);

function withQuery(
  path: string,
  options: { collection?: string; test?: number; part?: ToeicDictationPart },
) {
  const params = new URLSearchParams();
  if (options.collection) params.set("collection", options.collection);
  if (options.test !== undefined) params.set("test", String(options.test));
  if (options.part !== undefined) params.set("part", String(options.part));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
