import assert from "node:assert/strict";
import test from "node:test";

import { topicKeys } from "../hooks/use-topics";

test("topic list cache keys separate English and Vietnamese responses", () => {
  const listKey = topicKeys.list as unknown;

  assert.equal(typeof listKey, "function");
  if (typeof listKey !== "function") return;

  assert.notDeepEqual(listKey("en"), listKey("vi"));
  assert.deepEqual(listKey("vi"), ["topics", "list", "vi"]);
});

test("topic detail cache keys include locale before slug and level", () => {
  const detailKey = topicKeys.detail as unknown as (
    slug: string,
    locale: string,
    level?: string,
  ) => readonly string[];

  assert.notDeepEqual(
    detailKey("airport", "en", "A1"),
    detailKey("airport", "vi", "A1"),
  );
  assert.deepEqual(detailKey("airport", "vi", "A1"), [
    "topics",
    "detail",
    "vi",
    "airport",
    "A1",
  ]);
});
