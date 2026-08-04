# TOEIC Grammar Markdown Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render imported TOEIC Grammar lesson Markdown and its `example`/`note` directives as safe, localized learner UI instead of visible source syntax.

**Architecture:** Keep localization and lesson-card composition in `ToeicGrammarLessonContent`. Add a pure feature parser that splits supported directives from ordinary Markdown, then render those blocks through a focused `ToeicGrammarMarkdown` component backed by `react-markdown` and `remark-gfm`. Raw HTML remains disabled and structured JSON remains the fallback when no localized Markdown body exists.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind CSS, Node test runner, `react-markdown`, `remark-gfm`.

## Global Constraints

- Do not change the API contract, database schema, source pipeline, or imported lesson data.
- Do not use `dangerouslySetInnerHTML`, `rehype-raw`, or direct HTML injection.
- Support headings, paragraphs, line breaks, strong/emphasis, lists, inline/fenced code, horizontal rules, links, `:::example`, and `:::note`.
- Preserve unsupported or unclosed directives as visible ordinary Markdown.
- Preserve the structured-content fallback when localized Markdown is absent.
- Follow TDD: observe each focused test fail for the expected missing behavior before production implementation.

---

### Task 1: Pure Grammar directive parser

**Files:**

- Create: `apps/web/app/features/toeic-grammar/toeic-grammar-markdown.ts`
- Test: `apps/web/app/features/toeic-grammar/tests/toeic-grammar-markdown.test.ts`

**Interfaces:**

- Produces: `ToeicGrammarMarkdownBlock = { kind: "markdown" | "example" | "note"; content: string }`.
- Produces: `parseToeicGrammarMarkdown(value: string): ToeicGrammarMarkdownBlock[]`.
- The parser recognizes a directive only when an opening line is exactly `:::example` or `:::note` and a later line is exactly `:::`.

- [ ] **Step 1: Write the failing parser tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { parseToeicGrammarMarkdown } from "../toeic-grammar-markdown";

test("Grammar Markdown separates ordinary, example, and note blocks", () => {
  assert.deepEqual(
    parseToeicGrammarMarkdown(`# Heading

Intro with **strong text**.

:::example
Example body.
:::

:::note
Note body.
:::`),
    [
      { kind: "markdown", content: "# Heading\n\nIntro with **strong text**." },
      { kind: "example", content: "Example body." },
      { kind: "note", content: "Note body." },
    ]
  );
});

test("Grammar Markdown preserves unsupported and unclosed directives", () => {
  assert.deepEqual(parseToeicGrammarMarkdown(":::warning\nKeep this\n:::"), [
    { kind: "markdown", content: ":::warning\nKeep this\n:::" },
  ]);
  assert.deepEqual(parseToeicGrammarMarkdown(":::note\nUnclosed"), [
    { kind: "markdown", content: ":::note\nUnclosed" },
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-grammar/tests/toeic-grammar-markdown.test.ts
```

Expected: FAIL because `toeic-grammar-markdown.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure parser**

```ts
export type ToeicGrammarMarkdownBlock = {
  kind: "markdown" | "example" | "note";
  content: string;
};

const openingDirective = /^:::(example|note)\s*$/u;
const closingDirective = /^:::\s*$/u;

export function parseToeicGrammarMarkdown(
  value: string
): ToeicGrammarMarkdownBlock[] {
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  const blocks: ToeicGrammarMarkdownBlock[] = [];
  let markdown: string[] = [];

  const flushMarkdown = () => {
    const content = markdown.join("\n").trim();
    if (content) blocks.push({ kind: "markdown", content });
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const match = openingDirective.exec(lines[index] ?? "");
    if (!match) {
      markdown.push(lines[index] ?? "");
      continue;
    }

    const closingIndex = lines.findIndex(
      (line, candidate) => candidate > index && closingDirective.test(line)
    );
    if (closingIndex < 0) {
      markdown.push(...lines.slice(index));
      break;
    }

    flushMarkdown();
    const content = lines
      .slice(index + 1, closingIndex)
      .join("\n")
      .trim();
    if (content) {
      blocks.push({
        kind: match[1] as "example" | "note",
        content,
      });
    }
    index = closingIndex;
  }

  flushMarkdown();
  return blocks;
}
```

- [ ] **Step 4: Run the parser tests and verify GREEN**

Run the focused command from Step 2.

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the parser slice**

```powershell
git add apps/web/app/features/toeic-grammar/toeic-grammar-markdown.ts apps/web/app/features/toeic-grammar/tests/toeic-grammar-markdown.test.ts
git commit -m "feat(web): parse Grammar lesson directives"
```

### Task 2: Safe Markdown renderer and directive panels

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/app/features/toeic-grammar/components/ToeicGrammarMarkdown.tsx`
- Modify: `apps/web/test/toeic-grammar-practice-architecture.test.ts`

**Interfaces:**

- Consumes: `parseToeicGrammarMarkdown(value: string)` from Task 1.
- Produces: `ToeicGrammarMarkdown({ value }: { value: string })`.
- The component maps Markdown elements to project-owned Tailwind presentation and maps directive blocks to distinct example/note panels.

- [ ] **Step 1: Add a failing renderer architecture test**

Extend the Grammar lesson test with:

```ts
const markdown = read(
  "app/features/toeic-grammar/components/ToeicGrammarMarkdown.tsx"
);

assert.match(markdown, /ReactMarkdown/);
assert.match(markdown, /remarkGfm/);
assert.match(markdown, /parseToeicGrammarMarkdown/);
assert.match(markdown, /block\.kind === "example"/);
assert.match(markdown, /block\.kind === "note"/);
assert.match(markdown, /skipHtml/);
assert.doesNotMatch(markdown, /dangerouslySetInnerHTML|rehypeRaw/);
```

- [ ] **Step 2: Run the architecture test and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-grammar-practice-architecture.test.ts
```

Expected: FAIL because `ToeicGrammarMarkdown.tsx` does not exist.

- [ ] **Step 3: Install the two renderer dependencies**

Run:

```powershell
pnpm --filter @repo/web add react-markdown remark-gfm
```

Expected: `apps/web/package.json` and `pnpm-lock.yaml` include both packages with no unrelated dependency changes.

- [ ] **Step 4: Implement the safe renderer**

Create a client-compatible React component that:

```tsx
import { BookOpenCheck, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/app/utils/cn";
import { parseToeicGrammarMarkdown } from "../toeic-grammar-markdown";

type Props = { value: string };

function MarkdownBody({ value }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children }) => (
          <h1 className="mt-8 border-b pb-3 text-2xl font-bold tracking-tight first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 border-b pb-3 text-xl font-semibold tracking-tight first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 text-lg font-semibold tracking-tight">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="my-3 leading-7">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
        ),
        code: ({ children }) => (
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.9em]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted my-4 overflow-x-auto rounded-xl p-4 text-sm leading-6">
            {children}
          </pre>
        ),
        hr: () => <hr className="border-border my-7" />,
        a: ({ href, children }) => {
          const external = Boolean(href && /^https?:\/\//u.test(href));
          return (
            <a
              className="text-primary underline underline-offset-4"
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer noopener" : undefined}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {value}
    </ReactMarkdown>
  );
}

export function ToeicGrammarMarkdown({ value }: Props) {
  return (
    <div className="text-foreground/90 text-[15px]">
      {parseToeicGrammarMarkdown(value).map((block, index) => {
        const directive = block.kind !== "markdown";
        const Icon = block.kind === "example" ? BookOpenCheck : Info;
        return (
          <section
            key={`${block.kind}-${index}`}
            className={cn(
              directive && "my-5 rounded-xl border px-5 py-4",
              block.kind === "example" &&
                "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30",
              block.kind === "note" &&
                "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30"
            )}
          >
            {directive ? (
              <Icon className="mb-2 h-5 w-5" aria-hidden="true" />
            ) : null}
            <MarkdownBody value={block.content} />
          </section>
        );
      })}
    </div>
  );
}
```

Keep raw HTML disabled throughout the renderer.

- [ ] **Step 5: Run focused tests, typecheck, and lint**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-grammar/tests/toeic-grammar-markdown.test.ts test/toeic-grammar-practice-architecture.test.ts
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
```

Expected: all commands pass and raw HTML remains disabled.

- [ ] **Step 6: Commit the renderer slice**

```powershell
git add apps/web/package.json pnpm-lock.yaml apps/web/app/features/toeic-grammar/components/ToeicGrammarMarkdown.tsx apps/web/test/toeic-grammar-practice-architecture.test.ts
git commit -m "feat(web): render Grammar lesson Markdown"
```

### Task 3: Integrate Markdown into lesson cards

**Files:**

- Modify: `apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonContent.tsx`
- Modify: `apps/web/test/toeic-grammar-practice-architecture.test.ts`

**Interfaces:**

- Consumes: `ToeicGrammarMarkdown({ value })` from Task 2.
- Preserves: locale-first body selection and JSON fallback already owned by `ToeicGrammarLessonContent`.

- [ ] **Step 1: Change the architecture assertion before production code**

Replace the old plain-text assertion:

```ts
assert.match(content, /whitespace-pre-line/);
```

with:

```ts
assert.match(content, /ToeicGrammarMarkdown/);
assert.doesNotMatch(content, /whitespace-pre-line|function paragraphs/);
```

- [ ] **Step 2: Run the architecture test and verify RED**

Run:

```powershell
pnpm --filter @repo/web exec tsx --test test/toeic-grammar-practice-architecture.test.ts
```

Expected: FAIL because the lesson component still uses `paragraphs()` and `whitespace-pre-line`.

- [ ] **Step 3: Delegate non-empty lesson bodies to the renderer**

Remove `paragraphs()`, import `ToeicGrammarMarkdown`, and replace the body block with:

```tsx
{
  body ? (
    <div className="mt-5">
      <ToeicGrammarMarkdown value={body} />
    </div>
  ) : null;
}
```

Do not change locale fallback selection or the `structuredContent` `<pre>` fallback.

- [ ] **Step 4: Run focused and full Web verification**

```powershell
pnpm --filter @repo/web exec tsx --test app/features/toeic-grammar/tests/toeic-grammar-markdown.test.ts test/toeic-grammar-practice-architecture.test.ts
pnpm --filter @repo/web test
pnpm --filter @repo/web check-types
pnpm --filter @repo/web lint
```

Expected: every command passes with no warnings introduced by the renderer.

- [ ] **Step 5: Commit the integration slice**

```powershell
git add apps/web/app/features/toeic-grammar/components/ToeicGrammarLessonContent.tsx apps/web/test/toeic-grammar-practice-architecture.test.ts
git commit -m "fix(web): format Grammar lesson content"
```

### Task 4: Workspace regression and handoff

**Files:**

- Verify only; no planned production edits.

**Interfaces:**

- Verifies the complete feature against repository-wide gates.

- [ ] **Step 1: Run workspace gates sequentially**

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Expected: all Turbo tasks succeed.

- [ ] **Step 2: Inspect repository hygiene**

```powershell
git diff --check
git status --short
git log -5 --oneline
```

Expected: no whitespace errors, no secrets/generated content, and only intentional commits/files.

- [ ] **Step 3: Manually smoke-test the reported lesson**

Open:

```text
/vi/learn/cert/toeic/reading/grammar/4fbe6af5-70a3-48c9-af6d-e144c934505e
```

Confirm headings, bold choices, lists, inline suffix code, horizontal rules, example panels, and note panels render without visible Markdown control syntax. Confirm the English locale still uses English content when present and safely falls back to Vietnamese otherwise.
