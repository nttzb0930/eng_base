import { z } from "zod";

import { resolveDatabaseUrl } from "./database-url";

const booleanFromEnvironment = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .default("false")
  .transform((value) => value === true || value === "true");

const ApiEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().trim().min(1).optional(),
    DB_HOST: z.string().trim().min(1).optional(),
    DB_PORT: z.string().trim().min(1).optional(),
    DB_USER: z.string().trim().min(1).optional(),
    DB_PASSWORD: z.string().trim().min(1).optional(),
    DB_NAME: z.string().trim().min(1).optional(),
    DB_SCHEMA: z.string().trim().min(1).optional(),
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
    LICENSED_CONTENT_ROOT: z.string().trim().min(1).optional(),
    SMTP_ENABLED: booleanFromEnvironment,
    SMTP_HOST: z.string().trim().min(1).default("smtp.gmail.com"),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanFromEnvironment,
    SMTP_USER: z.string().trim().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    SMTP_FROM: z.string().trim().optional(),
    EMAIL_TEMPLATES_PATH: z
      .string()
      .trim()
      .min(1)
      .default("src/module/mail/templates"),
    GEMINI_ENABLED: booleanFromEnvironment,
    GEMINI_API_KEY: z.string().trim().optional().default(""),
    GEMINI_API_ENDPOINT: z
      .string()
      .trim()
      .url()
      .optional()
      .default(""),
    GEMINI_VISION_MODEL: z
      .string()
      .trim()
      .min(1)
      .default("gemini-3.5-flash-lite"),
    GEMINI_GRADING_MODEL: z
      .string()
      .trim()
      .min(1)
      .default("gemini-3.5-flash-lite"),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    WRITING_AI_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
    WRITING_AI_RESERVATION_TTL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(120_000),
    WRITING_AI_USER_LIMIT: z.coerce.number().int().positive().default(2),
    WRITING_AI_IP_LIMIT: z.coerce.number().int().positive().default(10),
    WRITING_AI_RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  })
  .refine(
    (configuration) =>
      configuration.JWT_ACCESS_SECRET !== configuration.JWT_REFRESH_SECRET,
    {
      message: "JWT access and refresh secrets must be different",
      path: ["JWT_REFRESH_SECRET"],
    }
  )
  .superRefine((configuration, context) => {
    if (configuration.SMTP_ENABLED) {
      if (!configuration.SMTP_USER) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_USER"],
          message: "SMTP_USER is required when SMTP_ENABLED=true",
        });
      }
      if (!configuration.SMTP_PASS) {
        context.addIssue({
          code: "custom",
          path: ["SMTP_PASS"],
          message: "SMTP_PASS is required when SMTP_ENABLED=true",
        });
      }
    }

    if (configuration.GEMINI_ENABLED && !configuration.GEMINI_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required when GEMINI_ENABLED=true",
      });
    }

    try {
      resolveDatabaseUrl(configuration);
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: `DATABASE_URL configuration is invalid: ${
          error instanceof Error ? error.message : "unknown database error"
        }`,
      });
    }
  })
  .passthrough();

export function validateEnvironment(configuration: Record<string, unknown>) {
  return ApiEnvironmentSchema.parse(configuration);
}
