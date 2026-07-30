import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");
const readWebFile = (path: string) =>
  readFileSync(join(webRoot, path), "utf8");

test("Dashboard and Learn render the same server-owned streak", () => {
  const dashboardView = readWebFile(
    "app/views/dashboard/DashboardView.tsx"
  );
  const learnView = readWebFile("app/views/learn/LearnView.tsx");

  assert.match(dashboardView, /dashboard\.streak\.currentStreak/);
  assert.match(dashboardView, /dashboard\.streak\.longestStreak/);
  assert.match(learnView, /dashboard\.streak\.currentStreak/);
  assert.doesNotMatch(learnView, /streakDays",\s*\{\s*count:\s*7/);
});

test("English and Vietnamese expose matching streak presentation copy", () => {
  const english = JSON.parse(
    readWebFile("app/messages/en.json")
  ) as Record<string, unknown>;
  const vietnamese = JSON.parse(
    readWebFile("app/messages/vi.json")
  ) as Record<string, unknown>;

  for (const key of ["currentStreak", "longestStreak", "streakTimeZone"]) {
    assert.equal(
      typeof (english.dashboard as Record<string, unknown>)[key],
      "string"
    );
    assert.equal(
      typeof (vietnamese.dashboard as Record<string, unknown>)[key],
      "string"
    );
  }
});
