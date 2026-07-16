import { webHttpClient } from "@/src/lib/web-http-client";

export async function clientApiRequest<Result>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
) {
  const response = await webHttpClient.request<Result>({
    url: path,
    method: options.method ?? "GET",
    data: options.body,
  });
  return response.data;
}
