import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("TOEIC Grammar practice route stays thin and owns a session skeleton", () => {
  const page = read("app/[locale]/(session)/toeic/grammar/practice/page.tsx");
  const loading = read(
    "app/[locale]/(session)/toeic/grammar/practice/loading.tsx"
  );

  assert.match(page, /ToeicGrammarPracticeView/);
  assert.match(page, /parseToeicGrammarPracticeRoute/);
  assert.doesNotMatch(page, /use client|fetch\(|webHttpClient|useQuery/);
  assert.match(loading, /ToeicGrammarPracticeSkeleton/);
});

test("Grammar practice grades option selection immediately and retries safely", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarPracticeView.tsx");

  assert.match(view, /useSubmitToeicGrammarAnswer/);
  assert.match(view, /crypto\.randomUUID\(\)/);
  assert.match(view, /beginGrammarAnswer/);
  assert.match(view, /retryGrammarAnswer/);
  assert.match(view, /answerGrammarQuestionSucceeded/);
  assert.doesNotMatch(view, /correctOptionId\s*===.*question\.options/);
  assert.doesNotMatch(view, /localStorage/);
});

test("Grammar session renders one question and sticky explicit-status navigation", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarPracticeView.tsx");
  const navigator = read(
    "app/features/toeic-grammar/components/ToeicGrammarQuestionNavigator.tsx"
  );

  assert.match(view, /ToeicGrammarQuestion/);
  assert.match(view, /fixed inset-x-0 bottom-0/);
  assert.match(view, /practice\.previous/);
  assert.match(view, /practice\.next/);
  assert.match(navigator, /Check/);
  assert.match(navigator, /X/);
  assert.match(navigator, /aria-current/);
});

test("Grammar lesson route stays thin and renders source content safely", () => {
  const page = read(
    "app/[locale]/(main)/learn/cert/toeic/reading/grammar/[subtopicId]/page.tsx"
  );
  const loading = read(
    "app/[locale]/(main)/learn/cert/toeic/reading/grammar/[subtopicId]/loading.tsx"
  );
  const content = read(
    "app/features/toeic-grammar/components/ToeicGrammarLessonContent.tsx"
  );
  const markdown = read(
    "app/features/toeic-grammar/components/ToeicGrammarMarkdown.tsx"
  );

  assert.match(page, /ToeicGrammarLessonView/);
  assert.doesNotMatch(page, /use client|fetch\(|webHttpClient|useQuery/);
  assert.match(loading, /ToeicGrammarLessonSkeleton/);
  assert.doesNotMatch(content, /dangerouslySetInnerHTML/);
  assert.match(content, /theoryContentVi/);
  assert.match(content, /whitespace-pre-line/);
  assert.match(markdown, /ReactMarkdown/);
  assert.match(markdown, /remarkGfm/);
  assert.match(markdown, /parseToeicGrammarMarkdown/);
  assert.match(markdown, /block\.kind === "example"/);
  assert.match(markdown, /block\.kind === "note"/);
  assert.match(markdown, /skipHtml/);
  assert.doesNotMatch(markdown, /dangerouslySetInnerHTML|rehypeRaw/);
});

test("Grammar detail exposes sibling subtopics and hides unavailable lessons", () => {
  const view = read("app/views/toeic-grammar/ToeicGrammarLessonView.tsx");
  const navigation = read(
    "app/features/toeic-grammar/components/ToeicGrammarSubtopicNavigation.tsx"
  );

  assert.match(view, /useToeicGrammarCatalog/);
  assert.match(view, /resolveToeicGrammarDetailTab/);
  assert.match(view, /detail\.lessons\.length > 0/);
  assert.match(view, /ToeicGrammarSubtopicNavigation/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /subtopic\.questionCount/);
  assert.match(navigation, /lg:hidden/);
  assert.match(navigation, /hidden lg:block/);
});
