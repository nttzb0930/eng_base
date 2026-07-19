export type DatabaseEnvironment = {
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  DB_SCHEMA?: string;
};

const COMPONENT_NAMES = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_SCHEMA",
] as const;

export function resolveDatabaseUrl(environment: DatabaseEnvironment) {
  const configuredUrl = environment.DATABASE_URL?.trim();
  if (configuredUrl && !configuredUrl.includes("${")) {
    assertPostgreSqlUrl(configuredUrl);
    return configuredUrl;
  }

  const components = Object.fromEntries(
    COMPONENT_NAMES.map((name) => [name, requiredComponent(environment, name)])
  ) as Record<(typeof COMPONENT_NAMES)[number], string>;
  const port = Number(components.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535");
  }

  const databaseUrl =
    `postgresql://${encodeURIComponent(components.DB_USER)}:` +
    `${encodeURIComponent(components.DB_PASSWORD)}@${components.DB_HOST}:${port}/` +
    `${encodeURIComponent(components.DB_NAME)}?schema=${encodeURIComponent(components.DB_SCHEMA)}`;
  assertPostgreSqlUrl(databaseUrl);
  return databaseUrl;
}

function requiredComponent(
  environment: DatabaseEnvironment,
  name: (typeof COMPONENT_NAMES)[number]
) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when DATABASE_URL is not resolved`);
  }
  return value;
}

function assertPostgreSqlUrl(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use a PostgreSQL protocol");
  }
}
