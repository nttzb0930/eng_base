import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildLocalePreferencePath,
  readLocalePreference,
  writeLocalePreference,
} from "../app/i18n/locale-preference";

const memoryStorage = (initial?: string) => {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
    value: () => value,
  };
};

test("locale preference defaults invalid or missing storage to English", () => {
  const missing = memoryStorage();
  const invalid = memoryStorage("fr");

  assert.equal(readLocalePreference(missing), "en");
  assert.equal(missing.value(), "en");
  assert.equal(readLocalePreference(invalid), "en");
  assert.equal(invalid.value(), "en");
});

test("locale preference reads and writes supported locales", () => {
  const storage = memoryStorage("vi");

  assert.equal(readLocalePreference(storage), "vi");
  writeLocalePreference(storage, "en");
  assert.equal(storage.value(), "en");
});

test("locale preference survives unavailable browser storage", () => {
  const unavailable = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  assert.equal(readLocalePreference(unavailable), "en");
  assert.doesNotThrow(() => writeLocalePreference(unavailable, "vi"));
});

test("locale preference path replaces locale and preserves URL suffixes", () => {
  assert.equal(
    buildLocalePreferencePath(
      "/vi/placement-test",
      "?from=signup",
      "#language",
      "en",
    ),
    "/en/placement-test?from=signup#language",
  );
});

test("localized layout mounts the browser locale preference synchronizer", () => {
  const componentPath = join(
    import.meta.dirname,
    "../app/components/LocalePreferenceSync.tsx",
  );
  assert.equal(existsSync(componentPath), true);

  const layout = readFileSync(
    join(import.meta.dirname, "../app/[locale]/layout.tsx"),
    "utf8",
  );
  assert.match(layout, /<LocalePreferenceSync \/>/);
});
