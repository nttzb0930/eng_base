import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("main learner loading fallback keeps the navigation shell", () => {
  const source = readFileSync(
    join(webRoot, "app/components/layout/LearnerShell.tsx"),
    "utf8",
  );

  assert.match(source, /function MainShellFallback/);
  assert.match(source, /<MobileHeader \/>/);
  assert.match(source, /<Header className="hidden lg:flex" \/>/);
  assert.match(source, /className="app-container py-6 sm:py-8 lg:py-10"/);
  assert.match(source, /getMainPageSkeleton/);
  assert.doesNotMatch(source, /: <ListPageSkeleton \/>/);
});

test("dashboard data loading uses the dashboard-shaped skeleton", () => {
  const source = readFileSync(
    join(webRoot, "app/views/dashboard/DashboardView.tsx"),
    "utf8",
  );

  assert.match(source, /DashboardPageSkeleton/);
  assert.match(source, /return <DashboardPageSkeleton \/>;/);
  assert.doesNotMatch(source, /import \{ ListPageSkeleton \}/);
});

test("main route loading files do not export the generic list skeleton", () => {
  const mainRouteDir = join(webRoot, "app/[locale]/(main)");
  const loadingFiles = filesUnder(mainRouteDir).filter((path) =>
    path.endsWith("loading.tsx"),
  );

  assert.ok(loadingFiles.length > 0);
  for (const path of loadingFiles) {
    const source = readFileSync(path, "utf8");
    assert.equal(
      /\bListPageSkeleton\b/u.test(source),
      false,
      `${path} must use a page-specific skeleton`,
    );
  }
});

test("main view loading branches use page-specific skeletons", () => {
  const checkedViews = [
    "app/views/learn/LearnView.tsx",
    "app/views/learn/LearnLevelView.tsx",
    "app/views/topics/TopicsView.tsx",
    "app/views/topics/TopicDetailView.tsx",
    "app/views/leaderboard/LeaderboardView.tsx",
    "app/views/saved-words/SavedWordsView.tsx",
    "app/views/flashcards/FlashcardsView.tsx",
    "app/views/practice/PracticeView.tsx",
    "app/views/courses/CoursesView.tsx",
  ];

  for (const path of checkedViews) {
    const source = readFileSync(join(webRoot, path), "utf8");
    assert.equal(
      source.includes("ListPageSkeleton"),
      false,
      `${path} must not use the generic list skeleton`,
    );
  }
});
