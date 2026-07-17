import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("Web shared presentation and i18n live under app", () => {
  for (const path of [
    "app/components/ui/button.tsx",
    "app/components/navigation/LocalizedLink.tsx",
    "app/components/layout/FeedWrapper.tsx",
    "app/components/feedback/RouteSkeletons.tsx",
    "app/i18n/config.ts",
    "app/i18n/paths.ts",
    "app/i18n/request.ts",
    "app/messages/en.json",
    "app/messages/vi.json",
    "app/utils/cn.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const path of ["src/components/ui", "src/lib/i18n", "src/i18n", "src/messages", "src/lib/utils.ts"]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});
