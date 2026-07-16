import { apiRequest } from "@/src/lib/api-client";

export const upsertChallengeProgress = (challengeId: number) =>
  apiRequest<void | { error: "hearts" }>(
    `/progress/challenges/${challengeId}`,
    { method: "POST" }
  );
