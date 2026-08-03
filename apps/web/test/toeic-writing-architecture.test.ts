import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
