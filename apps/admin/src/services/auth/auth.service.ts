import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createAuthService } from "./create-auth.service";

export const authService = createAuthService(adminHttpClient);
export * from "./create-auth.service";
