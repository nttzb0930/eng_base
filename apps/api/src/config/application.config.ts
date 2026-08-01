import { registerAs } from "@nestjs/config";
import { resolve } from "node:path";

function integer(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function resolveLicensedContentRoot(
  value: string | undefined,
  cwd = process.cwd()
) {
  return resolve(cwd, value?.trim() || "../../var/licensed-content/dautoeic");
}

export default registerAs("application", () => ({
  name: process.env.APP_NAME?.trim() || "English Base API",
  serviceName: process.env.APP_SERVICE_NAME?.trim() || "eng-base-api",
  port: integer(process.env.API_PORT, 4000),
  corsOrigins: (
    process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxyHops: integer(process.env.TRUST_PROXY_HOPS, 0),
  licensedContentRoot: resolveLicensedContentRoot(
    process.env.LICENSED_CONTENT_ROOT
  ),
  isProduction: process.env.NODE_ENV === "production",
}));
