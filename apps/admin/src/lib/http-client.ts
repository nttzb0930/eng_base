export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
};

export function createHttpClient({
  baseUrl,
  getAccessToken,
}: {
  baseUrl: string;
  getAccessToken?: () => string | null;
}) {
  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(normalizedPath, normalizedBaseUrl);

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const token = getAccessToken?.();
    const response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle 401/403 — clear auth and emit event
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        window.dispatchEvent(new Event("auth-reset"));
      }
    }

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      throw new HttpClientError(
        getErrorMessage(payload) ?? `Lỗi hệ thống: ${response.statusText}`,
        response.status,
        payload,
      );
    }

    if (response.status === 204) {
      return { success: true } as ApiEnvelope<T>;
    }

    if (payload === null) {
      throw new HttpClientError("Invalid API response", response.status);
    }

    // The Nest API returns raw JSON. Keep the normalization here so domain
    // services always consume one stable client contract.
    return { success: true, data: payload as T };
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("POST", path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("PUT", path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("PATCH", path, { ...options, body }),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>("DELETE", path, options),
  };
}

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }

  const message = (payload as { message?: unknown }).message;
  return Array.isArray(message)
    ? message.filter((item): item is string => typeof item === "string").join(", ")
    : typeof message === "string"
      ? message
      : undefined;
}

export function unwrap<T>(response: ApiEnvelope<T>): T {
  if (!response.success || response.data === undefined) {
    throw new HttpClientError(response.message ?? "Invalid response", 500);
  }
  return response.data;
}
