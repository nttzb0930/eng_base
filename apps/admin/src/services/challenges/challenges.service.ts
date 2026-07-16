import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createChallengesService, type ChallengesHttpClient } from "./create-challenges.service";

export const challengesService = createChallengesService(adminHttpClient as ChallengesHttpClient);
export * from "./create-challenges.service";
