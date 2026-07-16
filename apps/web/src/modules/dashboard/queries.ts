import { cache } from "react";
import type { DashboardStats } from "@repo/shared/dashboard";

import { apiRequest } from "@/src/lib/api-client";

export const getDashboardStats = cache(() =>
  apiRequest<DashboardStats>("/dashboard")
);
