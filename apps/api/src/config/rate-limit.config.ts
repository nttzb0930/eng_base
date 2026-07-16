import { registerAs } from "@nestjs/config";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default registerAs("rateLimit", () => ({
  global: {
    limit: positiveInteger(process.env.RATE_LIMIT_MAX, 100),
    ttlMs: positiveInteger(process.env.RATE_LIMIT_TTL, 60) * 1000,
  },
  login: {
    ipLimit: positiveInteger(process.env.AUTH_LOGIN_IP_LIMIT, 10),
    identityLimit: positiveInteger(
      process.env.AUTH_LOGIN_IDENTITY_LIMIT,
      5
    ),
    ttlMs: positiveInteger(process.env.AUTH_LOGIN_TTL, 60) * 1000,
  },
  register: {
    ipLimit: positiveInteger(process.env.AUTH_REGISTER_IP_LIMIT, 5),
    ttlMs: positiveInteger(process.env.AUTH_REGISTER_TTL, 3600) * 1000,
  },
  refresh: {
    ipLimit: positiveInteger(process.env.AUTH_REFRESH_IP_LIMIT, 30),
    sessionLimit: positiveInteger(process.env.AUTH_REFRESH_SESSION_LIMIT, 10),
    ttlMs: positiveInteger(process.env.AUTH_REFRESH_TTL, 60) * 1000,
  },
}));

