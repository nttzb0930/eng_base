import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Unit management edits persisted CEFR levels through the Shared contract", () => {
  const screenSource = readFileSync(
    join(
      process.cwd(),
      "app/features/courses/components/UnitsManagementScreen.tsx"
    ),
    "utf8"
  );
  const editorSource = readFileSync(
    join(
      process.cwd(),
      "app/features/courses/components/units/UnitEditorForm.tsx",
    ),
    "utf8",
  );
  const schemaSource = readFileSync(
    join(
      process.cwd(),
      "app/features/courses/components/units/unit-editor.schema.ts",
    ),
    "utf8",
  );
  const columnsSource = readFileSync(
    join(
      process.cwd(),
      "app/features/courses/components/units/unit-columns.tsx",
    ),
    "utf8",
  );

  assert.equal(editorSource.includes("CEFR_LEVELS"), true);
  assert.equal(editorSource.includes('cefrLevel: unit.cefrLevel ?? "none"'), true);
  assert.equal(editorSource.includes('<SelectItem value="none">'), true);
  assert.equal(
    schemaSource.includes('z.enum(["none", "A1", "A2", "B1", "B2"])'),
    true
  );
  assert.equal(screenSource.includes('values.cefrLevel === "none" ? null'), true);
  assert.equal(columnsSource.includes('header: "CEFR"'), true);
});
