import { z } from "zod";

const ApiEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
      .string()
      .trim()
      .min(1)
      .default("http://localhost:3000,http://localhost:3001"),
  })
  .passthrough();

export function validateEnvironment(configuration: Record<string, unknown>) {
  return ApiEnvironmentSchema.parse(configuration);
}
