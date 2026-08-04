import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { resolveLicensedContentRoot } from "./application.config";

test("licensed content root has a deterministic local default and supports override", () => {
  const cwd = resolve("workspace", "apps", "api");
  assert.equal(
    resolveLicensedContentRoot(undefined, cwd),
    resolve(cwd, "../../var/licensed-content/dautoeic")
  );
  assert.equal(
    resolveLicensedContentRoot("D:/private/toeic", cwd),
    resolve(cwd, "D:/private/toeic")
  );
});
