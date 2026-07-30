import { resolve } from "node:path";

import { createDautoeicReadingSource } from "./dautoeic-reading-source.js";
import { createFileReadingSourceStorage } from "./reading-source.storage.js";

export function requireReadingEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readingPositiveInteger(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function createReadingStorageFromEnvironment() {
  return createFileReadingSourceStorage({
    repositoryRoot: resolve(process.cwd(), "../.."),
    configuredRoot: process.env.READING_CONTENT_STORAGE_DIR,
  });
}

export function createReadingSourceFromEnvironment(sourceUrl: string) {
  const baseHost = new URL(sourceUrl).hostname;
  const allowedHosts = new Set([
    baseHost,
    ...(process.env.READING_SOURCE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]);
  return createDautoeicReadingSource({
    baseUrl: sourceUrl,
    authorization: requireReadingEnvironment(
      "READING_SOURCE_AUTHORIZATION",
    ),
    allowedHosts: [...allowedHosts],
    request: fetch,
    timeoutMs: readingPositiveInteger("READING_SOURCE_TIMEOUT_MS", 20_000),
    maxRetries: readingPositiveInteger("READING_SOURCE_MAX_RETRIES", 3),
  });
}
