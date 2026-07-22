import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Unit management edits persisted CEFR levels through the Shared contract", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "app/features/courses/components/UnitsManagementScreen.tsx"
    ),
    "utf8"
  );

  assert.equal(source.includes("CEFR_LEVELS"), true);
  assert.equal(source.includes('useState<"none" | CefrLevel>("none")'), true);
  assert.equal(source.includes('setCefrLevel("none")'), true);
  assert.equal(source.includes('setCefrLevel(u.cefrLevel ?? "none")'), true);
  assert.equal(
    source.includes('cefrLevel: cefrLevel === "none" ? null : cefrLevel'),
    true
  );
  assert.equal(source.includes('header: "CEFR"'), true);
});
