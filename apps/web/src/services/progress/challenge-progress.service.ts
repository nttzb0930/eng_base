import { clientApiRequest } from "@/src/lib/client-api-request";

export const upsertChallengeProgress = (challengeId: number) =>
  clientApiRequest<void | { error: "hearts" }>(`/progress/challenges/${challengeId}`, { method: "POST" });
