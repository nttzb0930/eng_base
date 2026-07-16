import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createLessonsService, type LessonsHttpClient } from "./create-lessons.service";

export const lessonsService = createLessonsService(adminHttpClient as LessonsHttpClient);
export * from "./create-lessons.service";
