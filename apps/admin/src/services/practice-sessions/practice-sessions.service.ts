import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createPracticeSessionsService, type PracticeSessionsHttpClient } from "./create-practice-sessions.service";

export const practiceSessionsService = createPracticeSessionsService(adminHttpClient as PracticeSessionsHttpClient);
export * from "./create-practice-sessions.service";
