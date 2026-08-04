# General English Local Navigation Design

## Goal

Complete the separation between General English and TOEIC by making CEFR,
topic learning, CEFR practice, and CEFR reading one locally navigable learning
area while preserving every current URL and backend contract.

## Current Problem

The Learning overview now presents General English and TOEIC as separate paths,
but the global learner header still presents Practice and Reading as peers of
Learning. Those generic labels point to General English capabilities while
TOEIC also owns distinct Listening and Reading capabilities. Learners can
therefore mistake `/reading` for TOEIC Reading or assume `/practice` combines
both progress models.

## Selected Design

General English owns one shared local navigation with four destinations:

1. CEFR: `/learn/level`
2. Topics: `/learn/topic`
3. CEFR Practice: `/practice`
4. CEFR Reading: `/reading`

The component is rendered only on browsing screens. Focused practice sessions,
reading sessions, and result screens keep their distraction-free session
layouts. TOEIC continues to use `ToeicSectionNav` and never renders the General
English navigation.

The global header and sidebar remove the generic Practice and Reading entries.
Their routes remain available and are represented by the active Learning item.
The General English area on `/learn` exposes all four destinations directly so
removing the global entries does not reduce discoverability.

## Alternatives Considered

### Keep Practice and Reading in global navigation with new labels

This is the smallest change, but the global navigation would continue mixing
one learning path's internal capabilities with top-level product areas.

### Add a new `/learn/general` route

This creates a clean technical root, but requires redirects and updates to
bookmarks, analytics, localized links, tests, and session exits. It is not
required to clarify ownership.

### Selected: local navigation with stable routes

This fixes the information architecture without route or data migrations and
matches the existing TOEIC local-navigation pattern.

## Component Ownership

Create
`apps/web/app/features/general-english/components/GeneralEnglishSectionNav.tsx`.
It accepts:

```ts
type GeneralEnglishSection = "cefr" | "topics" | "practice" | "reading";

type GeneralEnglishSectionNavProps = {
  active: GeneralEnglishSection;
  levelCount?: number;
  topicCount?: number;
};
```

The component owns route metadata and localized presentation. It uses
`LocalizedLink`, preserves locale, marks the selected entry with
`aria-current="page"`, and keeps each target at least 40 pixels tall. The
navigation remains one line on desktop and uses contained horizontal overflow
on narrow screens.

The old `DiscoveryTabs` component is removed after all consumers migrate
because its name and contract describe the obsolete three-way discovery model.

## Visual Direction

This is a targeted evolution of the current product UI:

- Design variance: 3
- Motion intensity: 2
- Visual density: 6
- Existing Tailwind and shadcn-compatible tokens remain authoritative.
- General English uses the established blue active treatment.
- Cards remain soft rounded rectangles and navigation actions use `rounded-md`.
- No new dependency, animation system, or visual language is introduced.

## Localization

Add synchronized English and Vietnamese labels for the local navigation:

- General English sections
- CEFR
- Topics
- CEFR Practice / Luyện tập CEFR
- CEFR Reading / Đọc hiểu CEFR

Generic message keys may remain for route compatibility, but the global header
and sidebar no longer render their generic Practice and Reading labels.

## State and Data Flow

No API, cache key, progress calculation, database model, or browser persistence
changes. `/practice` continues to use CEFR vocabulary summaries and
`/reading` continues to use CEFR reading passages. TOEIC attempts and progress
remain under TOEIC-owned APIs.

## Accessibility and Responsive Behavior

- Active state uses `aria-current`, visible text, and color.
- Every link retains a visible keyboard focus state.
- Labels remain understandable without icons.
- The navigation does not make the page horizontally scroll; only its own
  narrow container may scroll when required.
- Focused session routes do not receive browsing navigation.

## Testing

Regression tests verify:

- General English navigation exposes exactly the four approved routes.
- CEFR, Topics, Practice, and Reading browsing views compose the shared nav with
  the correct active state.
- TOEIC views do not compose the General English nav.
- Global header and sidebar no longer expose `/practice` or `/reading` as peer
  items.
- The Learning overview directly links to all four General English sections.
- English and Vietnamese catalogs expose identical navigation keys.

Run Web tests, architecture checks, type checks, lint, formatting, and the
production build. No migration command is required.

## Out of Scope

- Changing `/practice` or `/reading` URLs.
- Changing practice or reading content and grading behavior.
- Combining General English and TOEIC progress.
- Adding CEFR levels beyond those already supported by each API.
- Redesigning focused practice, reading, or TOEIC session screens.
