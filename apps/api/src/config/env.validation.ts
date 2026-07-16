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
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
      .string()
      .trim()
      .min(1)
      .default("http://localhost:3000,http://localhost:3001"),
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
