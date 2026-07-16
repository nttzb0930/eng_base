import { clientApiRequest } from "@/src/lib/client-api-request";

export const toggleSavedWord = (vocabularyItemId: number) =>
  clientApiRequest<{ saved: boolean }>(`/vocabulary/${vocabularyItemId}/toggle-saved`, { method: "POST" });
