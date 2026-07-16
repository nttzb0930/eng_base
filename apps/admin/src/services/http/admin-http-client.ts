import { createHttpClient } from "@/src/lib/http-client";

export const adminHttpClient = createHttpClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  getAccessToken: () =>
    typeof window !== "undefined" ? localStorage.getItem("admin_token") : null,
});
