# TOEIC Grammar Markdown Rendering Design

**Status:** Approved in conversation

## Goal

Render imported TOEIC Grammar lesson Markdown as readable learner content instead of exposing Markdown syntax, while keeping source HTML inert and preserving the existing structured-content fallback.

## Scope

The Web lesson view will support the Markdown constructs present in the licensed lesson snapshot:

- headings;
- paragraphs and line breaks;
- strong and emphasized text;
- unordered and ordered lists;
- inline code and fenced code;
- horizontal rules;
- links;
- `:::example` and `:::note` block directives.

This change does not alter the source pipeline, database schema, API contract, or imported lesson content.

## Architecture

Add a focused `ToeicGrammarMarkdown` component under the TOEIC Grammar feature. A small pure parser will split the source into ordinary Markdown blocks and supported directive blocks. Each block will then be rendered with `react-markdown` and `remark-gfm` using explicit React component mappings.

The existing `ToeicGrammarLessonContent` component remains responsible for choosing the localized lesson body and composing lesson cards. It delegates a non-empty Markdown body to `ToeicGrammarMarkdown`. If no localized text exists, it preserves the current structured JSON fallback.

## Directive Rendering

`:::example` becomes a visually distinct example panel. `:::note` becomes an instructional note panel. Their inner bodies use the same safe Markdown renderer as ordinary content.

An unclosed or unsupported `:::` directive is treated as ordinary Markdown text instead of being silently discarded. This keeps source content visible when a future directive is introduced.

## Safety

The renderer must not use `dangerouslySetInnerHTML`, `rehype-raw`, or direct HTML injection. Raw HTML embedded in source Markdown remains escaped or omitted by the Markdown library. Links use safe attributes and external links do not gain access to the opener window.

## Presentation

Typography follows the current Grammar lesson card rather than adding a global prose dependency. Component mappings provide consistent spacing, readable heading hierarchy, compact lists, inline-code treatment, and responsive overflow for code blocks. Directive panels use existing design tokens and remain legible in dark mode.

## Testing

Tests will cover:

- deterministic splitting of ordinary, example, and note blocks;
- preservation of unsupported or malformed directives;
- structural rendering support for headings, strong text, lists, code, rules, and directives;
- absence of unsafe HTML rendering;
- the existing lesson localization and structured-content fallback.

Focused tests will be written first and observed failing before implementation. Final verification includes Web tests, typecheck, lint, architecture checks, and production build.
