import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type MessageCatalog = Record<string, unknown>;

const messagesRoot = join(import.meta.dirname, "..", "app", "messages");
const readCatalog = (locale: "en" | "vi") =>
  JSON.parse(
    readFileSync(join(messagesRoot, `${locale}.json`), "utf8")
  ) as MessageCatalog;

function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function valueAtPath(catalog: MessageCatalog, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      catalog
    );
}

function placeholderNames(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(
    /\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:[,}])/g
  )) {
    if (match[1]) names.add(match[1]);
  }
  return [...names].sort();
}

test("English and Vietnamese catalogs expose identical message paths", () => {
  const english = readCatalog("en");
  const vietnamese = readCatalog("vi");

  assert.deepEqual(leafPaths(vietnamese).sort(), leafPaths(english).sort());
});

test("matching locale messages use identical placeholders", () => {
  const english = readCatalog("en");
  const vietnamese = readCatalog("vi");

  for (const path of leafPaths(english)) {
    const englishValue = valueAtPath(english, path);
    const vietnameseValue = valueAtPath(vietnamese, path);
    if (
      typeof englishValue !== "string" ||
      typeof vietnameseValue !== "string"
    ) {
      continue;
    }

    assert.deepEqual(
      placeholderNames(vietnameseValue),
      placeholderNames(englishValue),
      `Placeholder mismatch at ${path}`
    );
  }
});
