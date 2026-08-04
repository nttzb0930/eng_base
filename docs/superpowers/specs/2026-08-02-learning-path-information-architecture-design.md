# Learning Path Information Architecture Design

## Goal

Make the learner-facing information architecture distinguish general English
learning from TOEIC exam preparation without changing existing URLs, APIs,
persistence, or progress calculations.

## Problem

The current Learning screen presents “By level”, “By certificate”, and “By
topic” as three equivalent choices. They are not equivalent:

- CEFR and TOEIC represent different learning goals and progress models.
- Topic is a discovery dimension inside general English rather than a third
  qualification path.
- Generic Reading and Practice navigation overlaps in name with TOEIC Reading
  and TOEIC Listening practice.
- The TOEIC Listening label “By level” implies CEFR levels even though the
  content is organized by TOEIC Parts and tests.
- The certificate description advertises IELTS, TOEFL, and VSTEP although only
  TOEIC has a complete learner flow.

## Selected Approach

Use two primary learning paths on the Learning screen:

1. **General English**
   - CEFR learning (A1–B2)
   - Topic-based discovery
2. **TOEIC Preparation**
   - TOEIC overview
   - Listening and Reading capabilities

Topic remains visible, but it is presented as a secondary entry point owned by
General English instead of a peer qualification system. TOEIC receives an
explicit entry point rather than being hidden behind a generic certificate
label.

This approach preserves the current route hierarchy under
`/learn/cert/toeic` in the first phase. Renaming routes would add redirect,
bookmark, locale, analytics, and cache migration work without improving the
immediate learner experience.

## Alternatives Considered

### Keep three peer cards

This has the smallest diff but preserves the conceptual mismatch between a
framework, an exam, and a content filter. It also keeps TOEIC hidden behind a
label that promises unsupported certificates.

### Create a new top-level `/toeic` route immediately

This gives TOEIC the strongest technical separation, but it requires route
redirects and broad link updates across active session and result flows. It is
not needed to fix the current navigation problem and is deferred.

### Selected: separate paths while preserving routes

This provides a clear product boundary now, keeps localized links compatible,
and allows a future route migration to be evaluated independently.

## Learner Navigation Model

```text
Learning
├── General English
│   ├── Learn by CEFR: A1 → B2
│   └── Learn by topic
└── TOEIC Preparation
    ├── Overview
    ├── Listening
    │   ├── Listening tests: Parts 1–4 and Full Test
    │   └── Intensive listening
    │       ├── Check
    │       ├── Dictation
    │       └── Full listening
    └── Reading
        ├── Reading tests: Parts 5–7 and Full Test
        └── TOEIC Grammar
```

The existing global routes `/reading` and `/practice` continue to represent
general-English capabilities. TOEIC labels must always include TOEIC context
inside local navigation and headings so learners do not confuse them with the
global capabilities.

## Screen Design

### Learning overview

Replace the three equal learning-mode cards with two visually primary path
groups:

- General English contains a CEFR card and a Topic card.
- TOEIC Preparation contains one dedicated TOEIC card linking directly to
  `/learn/cert/toeic`.

The cards continue to use the established Tailwind design tokens, responsive
grid behavior, localized links, focus rings, icon-plus-text affordances, and
minimum 44-pixel action targets. This phase does not introduce a new visual
library or a second design system.

### Discovery navigation

The discovery tabs remain route-compatible but their copy reflects ownership:

- “CEFR” instead of “By level” where the scope would otherwise be ambiguous.
- “TOEIC” instead of “By certificate”.
- “Topics” remains available as general-English discovery.

The certificate catalog screen may remain as a compatibility screen, but its
visible copy must describe the currently available TOEIC path rather than
advertise unimplemented certificates.

### TOEIC local navigation

TOEIC screens receive a shared local navigation component with three entries:

- Overview
- Listening
- Reading

The component lives under the TOEIC capability and is composed by TOEIC route
views. It preserves locale through `LocalizedLink`, marks the active entry with
`aria-current`, and does not appear in focused test/session routes where the
session frame already owns exit and progress controls.

### Listening terminology

Rename the outer Listening modes:

- “By level” → “Listening tests”
- “Dictation” → “Intensive listening”

The inner intensive-listening modes remain Check, Dictation, and Full. This
prevents two nested controls from both being named Dictation.

### Reading terminology

Keep the Reading sibling modes but make the exam context explicit in copy:

- TOEIC Reading tests
- TOEIC Grammar

## Architecture and Ownership

- Localized route files remain thin and unchanged unless they need to pass an
  active navigation state into a view.
- Route-level composition remains in `apps/web/app/views`.
- Reusable TOEIC navigation presentation belongs to a TOEIC-owned frontend
  feature, not a global navigation technical bucket.
- Translation text remains synchronized in `apps/web/app/messages/en.json` and
  `apps/web/app/messages/vi.json`.
- No backend endpoint, Shared wire type, Prisma model, migration, or database
  data changes are part of this phase.

## State and Data Flow

This change does not alter data flow. Existing CEFR progress, TOEIC Reading
overview, and TOEIC Listening overview queries remain owned by their current
capabilities. UI grouping must not combine CEFR mastery with TOEIC attempt
metrics or synthesize progress in browser storage.

## Error Handling

Existing query loading and error states remain intact. Navigation components
are static localized links and require no new network error state. When TOEIC
content is unavailable, the existing TOEIC overview availability treatment is
preserved.

## Accessibility and Responsive Behavior

- Active navigation is conveyed through `aria-current`, text, and styling.
- Labels remain understandable without relying on icon shape or color.
- Keyboard focus remains visible on every link.
- The Learning path groups stack on narrow screens and avoid horizontal page
  scrolling.
- Focused learning sessions retain their current distraction-free layout.

## Testing

Add or update Web tests to verify:

- Vietnamese and English message catalogs contain the same new keys.
- The Learning view presents General English and TOEIC as the primary paths.
- TOEIC local navigation targets the existing localized-compatible routes and
  exposes the active item accessibly.
- Listening mode copy no longer describes TOEIC tests as CEFR levels.
- Existing architecture tests still accept capability/view ownership and thin
  routes.

Run the focused Web tests first, followed by Web architecture, type, lint, and
build gates. Database commands are not required.

## Out of Scope

- Moving `/learn/cert/toeic` to a new public route.
- Adding IELTS, TOEFL, or VSTEP.
- Combining or recalculating CEFR and TOEIC progress.
- Changing TOEIC grading, attempts, drafts, media delivery, or imported data.
- Redesigning focused TOEIC test, Grammar, or Dictation session behavior.
