import { adminHttpClient } from "@/src/services/http/admin-http-client";
import { createUnitsService, type UnitsHttpClient } from "./create-units.service";

export const unitsService = createUnitsService(adminHttpClient as UnitsHttpClient);
export * from "./create-units.service";
