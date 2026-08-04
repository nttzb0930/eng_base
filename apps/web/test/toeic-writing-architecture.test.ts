import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("Writing catalog route is thin and has a layout-matching skeleton", () => {
  const page = read("app/[locale]/(main)/learn/cert/toeic/writing/page.tsx");
  const loading = read(
    "app/[locale]/(main)/learn/cert/toeic/writing/loading.tsx"
  );

  assert.match(page, /ToeicWritingCatalogView/);
  assert.doesNotMatch(page, /use client|fetch\(|webHttpClient|useQuery/u);
  assert.match(loading, /ToeicWritingCatalogSkeleton/);
});

test("Writing catalog keeps the selected Part in the URL", () => {
  const catalog = read("app/views/toeic-writing/ToeicWritingCatalogView.tsx");

  assert.match(catalog, /useSearchParams/u);
  assert.match(catalog, /searchParams\.get\("part"\)/u);
  assert.doesNotMatch(catalog, /useState<ToeicWritingPart>/u);
});

test("Writing catalog gates protected image loading by viewport visibility", () => {
  const nearViewportPath = resolve(
    process.cwd(),
    "app/features/toeic-writing/hooks/use-near-viewport.ts"
  );
  assert.equal(
    existsSync(nearViewportPath),
    true,
    "near-viewport hook must exist"
  );
  if (!existsSync(nearViewportPath)) return;

  const nearViewport = readFileSync(nearViewportPath, "utf8");
  const imageHook = read(
    "app/features/toeic-writing/hooks/use-toeic-writing-image-url.ts"
  );

  assert.match(nearViewport, /IntersectionObserver/u);
  assert.match(nearViewport, /rootMargin:\s*"240px"/u);
  assert.match(imageHook, /enabled\s*=\s*true/u);
  assert.match(imageHook, /if\s*\(!enabled\)/u);
  assert.match(imageHook, /URL\.revokeObjectURL/u);
});

test("Writing catalog renders dedicated Part-specific responsive cards", () => {
  const partOnePath = resolve(
    process.cwd(),
    "app/features/toeic-writing/components/ToeicWritingPartOneCard.tsx"
  );
  const partTwoPath = resolve(
    process.cwd(),
    "app/features/toeic-writing/components/ToeicWritingPartTwoCard.tsx"
  );
  assert.equal(existsSync(partOnePath), true, "Part 1 card must exist");
  assert.equal(existsSync(partTwoPath), true, "Part 2 card must exist");
  if (!existsSync(partOnePath) || !existsSync(partTwoPath)) return;

  const catalog = read("app/views/toeic-writing/ToeicWritingCatalogView.tsx");
  const partOne = readFileSync(partOnePath, "utf8");
  const partTwo = readFileSync(partTwoPath, "utf8");

  assert.match(catalog, /ToeicWritingPartOneCard/u);
  assert.match(catalog, /ToeicWritingPartTwoCard/u);
  assert.match(catalog, /buildToeicWritingPatternFilters/u);
  assert.match(catalog, /role="tablist"/u);
  assert.match(catalog, /xl:grid-cols-4/u);
  assert.match(partOne, /useNearViewport/u);
  assert.doesNotMatch(partOne, /task\.title|task\.order|difficulty/u);
  assert.doesNotMatch(partTwo, /locale\s*===\s*"vi"/u);
  assert.doesNotMatch(partTwo, /locale:\s*string/u);
  assert.doesNotMatch(catalog, /locale=\{locale\}/u);
  assert.match(partTwo, /task\.titleVi/u);
});

test("Writing Part routes are thin and share the focused session workspace", () => {
  for (const part of [1, 2]) {
    const page = read(
      `app/[locale]/(session)/toeic/writing/part-${part}/[taskId]/page.tsx`
    );
    const loading = read(
      `app/[locale]/(session)/toeic/writing/part-${part}/[taskId]/loading.tsx`
    );

    assert.match(page, /ToeicWritingSessionView/);
    assert.match(page, new RegExp(`expectedPart=\\{${part}\\}`));
    assert.doesNotMatch(page, /use client|webHttpClient|useQuery/u);
    assert.match(loading, /ToeicWritingSessionSkeleton/);
  }
});

test("Writing submission route is thin and owns a result skeleton", () => {
  const page = read(
    "app/[locale]/(session)/toeic/writing/submissions/[submissionId]/page.tsx"
  );
  const loading = read(
    "app/[locale]/(session)/toeic/writing/submissions/[submissionId]/loading.tsx"
  );

  assert.match(page, /ToeicWritingSubmissionView/);
  assert.doesNotMatch(page, /use client|webHttpClient|useQuery/u);
  assert.match(loading, /ToeicWritingResultSkeleton/);
});

test("Writing is discoverable from the TOEIC overview", () => {
  const overview = read("app/views/toeic-reading/ToeicOverviewView.tsx");
  const skeleton = read(
    "app/features/toeic-reading/components/ToeicOverviewSkeleton.tsx"
  );

  assert.match(overview, /useToeicWritingOverview/);
  assert.match(overview, /learn\/cert\/toeic\/writing/u);
  assert.match(overview, /overview\.writing/);
  assert.match(skeleton, /length: 3/);
});

test("Writing catalog owns localized English and Vietnamese messages", () => {
  for (const locale of ["en", "vi"]) {
    const messages = JSON.parse(read(`app/messages/${locale}.json`)) as Record<
      string,
      unknown
    >;
    assert.equal(typeof messages.toeicWriting, "object", locale);
  }
});
