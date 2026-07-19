import { z } from "zod";

const ApiEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z
      .string()
      .trim()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z
      .string()
      .trim()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default("7d"),
    APP_NAME: z.string().trim().min(1).default("English Base API"),
    APP_SERVICE_NAME: z.string().trim().min(1).default("eng-base-api"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
      .string()
      .trim()
      .min(1)
      .default("http://localhost:3000,http://localhost:3001"),
    RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_LOGIN_IP_LIMIT: z.coerce.number().int().positive().default(10),
    AUTH_LOGIN_IDENTITY_LIMIT: z.coerce.number().int().positive().default(5),
    AUTH_LOGIN_TTL: z.coerce.number().int().positive().default(60),
    AUTH_REGISTER_IP_LIMIT: z.coerce.number().int().positive().default(5),
    AUTH_REGISTER_TTL: z.coerce.number().int().positive().default(3600),
    AUTH_REFRESH_IP_LIMIT: z.coerce.number().int().positive().default(30),
    AUTH_REFRESH_SESSION_LIMIT: z.coerce.number().int().positive().default(10),
    AUTH_REFRESH_TTL: z.coerce.number().int().positive().default(60),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  })
  .refine(
    (configuration) =>
      configuration.JWT_ACCESS_SECRET !== configuration.JWT_REFRESH_SECRET,
    {
      message: "JWT access and refresh secrets must be different",
      path: ["JWT_REFRESH_SECRET"],
    }
  )
  .passthrough();

export function validateEnvironment(configuration: Record<string, unknown>) {
  return ApiEnvironmentSchema.parse(configuration);
}
