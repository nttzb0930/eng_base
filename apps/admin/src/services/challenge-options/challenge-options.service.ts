import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createChallengeOptionsService, type ChallengeOptionsHttpClient } from "./create-challenge-options.service";

export const challengeOptionsService = createChallengeOptionsService(adminHttpClient as ChallengeOptionsHttpClient);
export * from "./create-challenge-options.service";
