import { apiRequest } from "@/src/lib/api-client";

export const toggleSavedWord = (vocabularyItemId: number) =>
  apiRequest<{ saved: boolean }>(
    `/vocabulary/${vocabularyItemId}/toggle-saved`,
    { method: "POST" }
  );
