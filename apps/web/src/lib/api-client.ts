import { cookies } from "next/headers";

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const reviveDates = (_key: string, value: unknown) => {
  if (typeof value === "string" && ISO_DATE.test(value)) {
    return new Date(value);
  }
  return value;
};

export async function apiRequest<Result>(
  path: string,
  init: ApiRequestInit = {}
): Promise<Result> {
  const cookieStore = await cookies();
  let token = cookieStore.get("user_token")?.value;
  const refreshToken = cookieStore.get("client_refresh_token")?.value;
  const apiUrl = process.env.API_URL ?? "http://localhost:4000/api";

  if (!token && refreshToken) {
    const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `client_refresh_token=${encodeURIComponent(refreshToken)}` },
      cache: "no-store",
    });
    if (refreshResponse.ok) {
      const refreshed = (await refreshResponse.json()) as { access_token: string };
      token = refreshed.access_token;
    }
  }
  if (!token) throw new Error("Unauthorized.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed with ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text, reviveDates) : undefined) as Result;
}
