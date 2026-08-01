import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("main learner headers occupy document flow without manual content offsets", () => {
  const shell = read("app/components/layout/LearnerShell.tsx");
  const mobileHeader = read("app/components/navigation/MobileHeader.tsx");

  assert.match(mobileHeader, /sticky top-0/);
  assert.doesNotMatch(mobileHeader, /fixed top-0/);
  assert.match(shell, /className="min-h-dvh min-w-0"/);
  assert.doesNotMatch(shell, /pt-16/);
  assert.doesNotMatch(shell, /lg:pt-\[68px\]/);
});
