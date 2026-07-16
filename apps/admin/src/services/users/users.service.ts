import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createUsersService, type UsersHttpClient } from "./create-users.service";

export const usersService = createUsersService(adminHttpClient as UsersHttpClient);
export * from "./create-users.service";
