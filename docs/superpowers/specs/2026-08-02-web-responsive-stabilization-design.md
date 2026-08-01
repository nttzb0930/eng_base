# Web Responsive Stabilization Design

## Goal

Stabilize the Learner Web experience across mobile, tablet, laptop, and desktop without redesigning the existing visual language or changing API behavior. Dashboard is the first tracer page because it currently exposes header overlap, narrow content, and early multi-column layout problems.

## Scope

This work covers `apps/web` only. It includes authenticated browsing pages, focused learning sessions, authentication, placement, loading, empty, error, and result states. `apps/admin`, API contracts, persistence, and data pipelines are out of scope.

The supported audit widths are:

- 360px and 390px for phones;
- 768px for tablets;
- 1024px for small laptops;
- 1440px for desktop.

At every width, the document must avoid unintended horizontal overflow, fixed controls must not cover content, and primary actions must remain reachable.

## Approach

Use a shell-first, phased repair instead of isolated page patches. Shared layout failures are corrected once, then representative pages become tracer pages for each layout family. Existing Tailwind, Radix/shadcn primitives, colors, typography, and component ownership remain in place.

The rejected alternatives are:

- page-by-page patches, because they duplicate breakpoint and overflow rules;
- an immediate full Playwright visual matrix, because the repository does not yet own E2E infrastructure or a test login fixture;
- a visual redesign, because the reported problem is layout reliability rather than branding.

## Phase 1: Dashboard and the Main Shell

Dashboard is repaired first and serves as the browsing-page tracer.

- Mobile and desktop headers use one document-flow model. A sticky header occupies its own space, so the main content does not add a second manual header offset.
- The main content wrapper owns `min-width: 0`, a stable full-width container, and page gutters of 16px on phones, 24px on tablets, and 32px on desktop.
- Dashboard headings must start below the header at scroll position zero and remain readable after scrolling.
- The recommendation panel and queue cards use full available width on phones.
- The three queue cards remain one column on phones and move to three columns only when each card has sufficient usable width.
- Long Vietnamese and English labels wrap inside their card rather than expanding the document.
- Dashboard skeleton breakpoints mirror the real Dashboard layout.

## Phase 2: General English Browsing

Audit Dashboard-adjacent browsing layouts: Learn, CEFR, Topics, Topic detail, Practice, and Reading.

- Shared section navigation may scroll horizontally inside its own boundary, but never expands `body`.
- Card grids collapse explicitly to one column before adding columns at wider breakpoints.
- Filters, search, progress summaries, and call-to-action rows wrap or stack without shrinking text below readable sizes.
- Topic-detail secondary navigation uses an internal scroll region on mobile and a sidebar only at desktop widths.

## Phase 3: Review and Retention

Audit Saved Words, Flashcards, Review, and Leaderboard.

- Dense statistics reduce column count at phone widths.
- Flashcard and quiz actions remain reachable without overlapping content.
- Podium, tables, pagination, and status pills have deliberate mobile layouts instead of relying on desktop flex shrink.

## Phase 4: TOEIC and Focused Sessions

Audit TOEIC overview, Reading, Listening, Grammar, Dictation, and their result pages.

- Two-pane workspaces stack below their intended desktop breakpoint.
- Sticky question navigation and fixed footers reserve matching bottom space in the content.
- Audio controls, question grids, mode tabs, translations, vocabulary, and answer options wrap or scroll only inside their own component.
- Full-test and practice modes preserve their existing behavioral rules.

## Phase 5: Entry and Feedback States

Audit Sign In, Sign Up, Placement Test, loading skeletons, not-found, error, and empty states.

- Viewport-height layouts use dynamic viewport units and remain usable with mobile browser chrome and the virtual keyboard.
- Dialogs and sheets respect phone gutters and have vertically scrollable content when needed.
- Loading states use the same breakpoint behavior and approximate dimensions as their resolved page.

## Responsive Contracts

The implementation will introduce regression assertions around shared layout contracts and representative page classes before each fix. Tests will verify:

- one consistent header/content-flow contract;
- `min-w-0` at flex/grid boundaries that own variable content;
- explicit mobile fallbacks for multi-column layouts;
- reserved content space for fixed session controls;
- localized navigation contained by internal overflow;
- responsive parity between each tracer page and its skeleton.

Static tests do not replace browser inspection. Development verification will use the running app at the five target widths, beginning with the supplied Dashboard reproduction. Authenticated screens that cannot be automated without a test session will be smoke-tested in the existing signed-in browser after deterministic source-level regressions pass.

## Accessibility and Interaction

- Controls retain visible focus treatment and at least a 40px target, aiming for 44px on primary mobile actions.
- Layout changes preserve semantic heading order and existing ARIA states.
- Information cannot depend only on color.
- Horizontal scrolling is limited to controls designed for it and remains keyboard accessible.
- Motion changes are not part of this task; existing reduced-motion behavior remains intact.

## Delivery and Checkpoints

Each phase is a separately reviewable commit. Dashboard and the shared shell must pass focused tests and manual viewport inspection before later pages are changed. No phase may hide overflow globally as a substitute for fixing the owning component.

The final handoff requires Web tests, architecture checks, type-checking, lint, production build, formatting, and a clean diff review. Existing unrelated warnings will be reported rather than silently broadened into this task.
