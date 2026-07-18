import assert from "node:assert/strict";
import test from "node:test";

import { reviveApiDates } from "../app/features/auth/api/web-http-client";

test("browser API transport preserves the previous ISO date revival behavior", () => {
  const value = reviveApiDates({
    nextReviewAt: "2026-07-17T01:02:03.000Z",
    nested: [{ createdAt: "2026-07-16T01:02:03Z", label: "A1" }],
  }) as { nextReviewAt: Date; nested: Array<{ createdAt: Date; label: string }> };

  assert.equal(value.nextReviewAt instanceof Date, true);
  assert.equal(value.nested[0]?.createdAt instanceof Date, true);
  assert.equal(value.nested[0]?.label, "A1");
});
