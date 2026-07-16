const SENSITIVE_KEY_PARTS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "session",
  "token",
] as const;

const MAX_DEPTH = 8;
const MAX_TEXT_LENGTH = 2048;

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
  if (typeof value === "string") {
    return value.length > MAX_TEXT_LENGTH
      ? `${value.slice(0, MAX_TEXT_LENGTH)}...[TRUNCATED]`
      : value;
  }
  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? "[REDACTED]" : redactLogValue(item, depth + 1),
      ])
    );
  }
  return String(value);
}
