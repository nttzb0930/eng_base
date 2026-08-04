import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("the focused learner session shell owns vertical page scrolling", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/components/layout/LearnerShell.tsx"),
    "utf8"
  );
  const sessionShell =
    source.match(
      /if \(mode === "session"\)[\s\S]*?return \(\s*<div className="([^"]+)"/u
    )?.[1] ?? "";

  assert.match(sessionShell, /\boverflow-y-auto\b/u);
  assert.doesNotMatch(sessionShell, /\boverflow-hidden\b/u);
});
