import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldSkipLocalePrefix,
  withLocale,
} from "../src/lib/i18n/paths";

test("withLocale prefixes learner paths and preserves query strings", () => {
  assert.equal(withLocale("/practice?mode=listening", "en"), "/en/practice?mode=listening");
  assert.equal(withLocale("/", "vi"), "/vi");
});

test("withLocale replaces an existing locale instead of duplicating it", () => {
  assert.equal(withLocale("/vi/dashboard", "en"), "/en/dashboard");
});

test("locale middleware skips public assets and API paths", () => {
  assert.equal(shouldSkipLocalePrefix("/api/health"), true);
  assert.equal(shouldSkipLocalePrefix("/images/mascot.svg"), true);
  assert.equal(shouldSkipLocalePrefix("/dashboard"), false);
});
