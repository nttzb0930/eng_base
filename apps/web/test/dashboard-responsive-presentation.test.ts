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

test("Dashboard keeps variable content contained and delays dense grids", () => {
  const dashboard = read("app/views/dashboard/DashboardView.tsx");
  const reviewQueues = dashboard.slice(
    dashboard.indexOf("{/* Your review queues */}"),
    dashboard.indexOf("{(() => {")
  );

  assert.match(
    dashboard,
    /className="(?=[^"]*\bw-full\b)(?=[^"]*\bmin-w-0\b)[^"]*"/
  );
  assert.match(dashboard, /grid min-w-0 gap-4 md:grid-cols-3/);
  assert.doesNotMatch(dashboard, /sm:grid-cols-3/);
  assert.match(dashboard, /overflow-hidden rounded-lg bg-gradient-to-br p-5/);
  assert.equal(
    reviewQueues.match(/flex-col overflow-hidden rounded-2xl/g)?.length,
    3,
    "all review queue cards must clip decorative glows"
  );
});

test("Dashboard skeleton mirrors queue and CEFR responsive grids", () => {
  const skeletons = read("app/components/feedback/RouteSkeletons.tsx");
  const dashboardSkeleton = skeletons.slice(
    skeletons.indexOf("export function DashboardPageSkeleton"),
    skeletons.indexOf("export function ListPageSkeleton")
  );

  assert.match(dashboardSkeleton, /grid gap-4 md:grid-cols-3/);
  assert.match(dashboardSkeleton, /grid gap-4 sm:grid-cols-2 xl:grid-cols-4/);
  assert.doesNotMatch(
    dashboardSkeleton,
    /Array\.from\(\{ length: 4 \}\)[\s\S]*compact/
  );
});
