import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createCoursesService, type CoursesHttpClient } from "./create-courses.service";

export const coursesService = createCoursesService(adminHttpClient as CoursesHttpClient);
export * from "./create-courses.service";
