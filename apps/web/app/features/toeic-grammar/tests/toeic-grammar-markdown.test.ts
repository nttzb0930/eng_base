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
      {
        kind: "markdown",
        content: "# Heading\n\nIntro with **strong text**.",
      },
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
