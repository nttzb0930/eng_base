import { registerAs } from "@nestjs/config";

export type GeminiConfiguration = {
  enabled: boolean;
  apiKey: string;
  apiEndpoint: string;
  visionModel: string;
  gradingModel: string;
  timeoutMs: number;
  dailyLimit: number;
  reservationTtlMs: number;
};

function environmentBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function environmentNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") return value;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function environmentString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function resolveGeminiConfiguration(
  environment: Record<string, unknown>
): GeminiConfiguration {
  return {
    enabled: environmentBoolean(environment.GEMINI_ENABLED),
    apiKey: environmentString(environment.GEMINI_API_KEY),
    apiEndpoint: environmentString(environment.GEMINI_API_ENDPOINT),
    visionModel: environmentString(
      environment.GEMINI_VISION_MODEL,
      "gemini-3.5-flash-lite"
    ),
    gradingModel: environmentString(
      environment.GEMINI_GRADING_MODEL,
      "gemini-3.5-flash-lite"
    ),
    timeoutMs: environmentNumber(environment.GEMINI_TIMEOUT_MS, 20_000),
    dailyLimit: environmentNumber(environment.WRITING_AI_DAILY_LIMIT, 5),
    reservationTtlMs: environmentNumber(
      environment.WRITING_AI_RESERVATION_TTL_MS,
      120_000
    ),
  };
}

export default registerAs("gemini", () =>
  resolveGeminiConfiguration(process.env)
);
