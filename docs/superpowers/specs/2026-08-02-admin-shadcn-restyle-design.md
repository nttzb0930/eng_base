# Admin Shadcn Restyle Design

## Status

Approved direction pending written-spec review. The selected visual direction is
the neutral Shadcn dashboard with the lighter typography hierarchy derived from
the local Warranty Admin implementation.

## Context

English Base Admin already follows the repository's feature/view ownership
profile and its architecture, tests, type check, and lint gates pass. Its UI is
nevertheless inconsistent:

- Shadcn-style primitives exist without an Admin `components.json` registry.
- primitives are split between app-local files and the small `@repo/ui` package
  without a documented generation rule;
- semantic theme tokens exist, but screens frequently override them with
  literal Zinc colors;
- native selects, textareas, radios, and browser `confirm()` dialogs coexist
  with Radix/Shadcn controls;
- large management screens mix table columns, form state, validation, dialogs,
  and mutation orchestration;
- installed form and table libraries are mostly unused;
- navigation is a flat list that no longer reflects the expanded capability
  set;
- Settings exposes only `MAX_HEARTS` through an untyped arbitrary key/value
  API.

The local Warranty Admin demonstrates a calmer hierarchy: body copy uses normal
weight, controls and navigation use medium weight, headings use semibold, and
global CSS owns only truly global browser behavior. English Base will adopt
those principles without copying Warranty's project-specific folder profile or
its unverified font loading.

## Goals

1. Rebuild every existing Admin screen on one current Shadcn/Radix visual
   system.
2. Make typography, spacing, control sizes, responsive behavior, dark mode,
   loading, error, empty, and destructive states consistent.
3. Preserve the capability-first feature/view architecture and all observable
   HTTP and React Query behavior unless this design explicitly adds a Settings
   Interface.
4. Decompose oversized screens into focused components with app-wide patterns
   under `app/components` and capability-specific workflows under
   `app/features/<capability>/components`.
5. Replace the arbitrary Settings UI with a typed, validated set of safe
   runtime business policies.
6. Deliver the redesign in independently verifiable vertical slices instead of
   a single all-at-once visual rewrite.

## Non-goals

- Do not redesign Learner Web.
- Do not create a new backend Admin capability; delivery remains with each
  business owner.
- Do not add an Admin analytics dashboard without an owner and a real API.
  `/` may continue to redirect to Course Management.
- Do not expose SMTP credentials, JWT secrets, database configuration,
  provider keys, licensed-content paths, CORS, or rate limits in Settings.
- Do not introduce Admin i18n as part of this restyle. Existing visible copy is
  normalized to consistent Vietnamese, while domain terms may retain an
  explanatory English label where useful.
- Do not change Course Management methods, paths, pagination envelopes, query
  key roots, immutable course codes, or the camelCase
  `/admin/challengeOptions` route.
- Do not run migrations, seeds, vocabulary workflows, provider calls, or
  database writes while implementing or verifying the UI.

## UI platform

### Tailwind and Shadcn baseline

Admin moves from its partial Tailwind 3/Shadcn-style setup to the same proven
CSS-first baseline used by Warranty Admin:

- Tailwind CSS 4;
- `@tailwindcss/postcss`;
- `tw-animate-css`;
- the Shadcn CLI as a development dependency;
- an Admin-owned `components.json` whose aliases target
  `@/app/components` and `@/app/utils/cn`;
- `@source` for the exact shared primitive sources in `packages/ui`;
- `@custom-variant dark` for class-based dark mode.

The old Admin Tailwind config and `tailwindcss-animate` dependency are removed
only after the CSS-first replacement compiles and its architecture check is
updated. Web remains on its current styling stack; this design does not couple
the two frontend migrations.

### Component ownership

Shadcn is a source-code system, not a runtime component dependency. Generated
or adapted Admin-only primitives live in:

```text
apps/admin/app/components/ui/
```

An exact primitive already shared by Web and Admin remains in `packages/ui` and
is re-exported through the Admin-owned import path when doing so prevents
application code from depending on package placement. New primitives are not
moved into `packages/ui` merely because they look reusable. They move only when
Web and Admin have the same behavior, in accordance with the frontend
architecture.

The initial Admin primitive set is:

- alert dialog;
- avatar;
- badge;
- button;
- card;
- checkbox;
- collapsible;
- dialog;
- dropdown menu;
- input;
- label;
- pagination controls;
- select;
- separator;
- sheet;
- skeleton;
- switch;
- table;
- tabs;
- textarea;
- tooltip.

Every application screen consumes these primitives rather than restyling a
native control. Native inputs remain inside primitive implementations or where
semantic HTML has no equivalent Radix primitive.

## Global visual system

### Font loading and weight hierarchy

Admin loads Inter through `next/font/google`, exposes it as `--font-inter`, and
uses it through the Tailwind font token. The body does not merely name an
unloaded local `Inter` font.

The approved hierarchy is:

| Role                         | Size and weight                  |
| ---------------------------- | -------------------------------- |
| Page title                   | `24px / 600`, normal tracking    |
| Card/dialog title            | `15-18px / 600`, normal tracking |
| Navigation, labels, buttons  | `13-14px / 500`                  |
| Body and table data          | `13-14px / 400`                  |
| Helper and metadata          | `11-12px / 400`                  |
| Exceptional warning emphasis | `600-700`, used locally          |

`font-black`, broad `font-bold`, and decorative negative letter spacing are
removed from normal management presentation. Uppercase is restricted to short
eyebrows and compact table headers.

### Semantic tokens

`globals.css` becomes the canonical owner of light/dark semantic tokens for
background, foreground, card, popover, primary, secondary, muted, accent,
destructive, border, input, ring, chart/status colors, and radius. Components
consume semantic utilities such as `bg-background`, `text-muted-foreground`,
and `border-border` rather than page-local Zinc values.

App-specific global tokens are limited to concerns such as route-progress
color and scrollbar colors. Following Warranty's useful browser-level rules,
Admin also owns:

- `color-scheme` for light and dark modes;
- stable scrollbar gutter;
- thin scrollbar styling;
- Radix scroll-lock margin compensation;
- full-height document defaults.

Global CSS does not contain screen layout classes, form spacing, or
capability-specific colors.

### Theme

Admin adds a class-based theme provider with system, light, and dark choices.
The shell exposes an accessible theme menu. Every rebuilt screen must be usable
in both light and dark modes; the existing nominal dark variables are not
considered sufficient while screens hard-code white and Zinc surfaces.

### Density and geometry

- Main control height: 40px; compact table controls: 36px; touch targets on
  small screens: at least 44px.
- Base radius: 8px; cards and large dialogs: 10-12px; pills only for badges,
  switches, or genuinely pill-shaped controls.
- Borders carry most separation. Shadows remain subtle and are not stacked.
- Main content uses a consistent maximum width and `24-32px` desktop page
  padding with reduced mobile padding.
- Motion is limited to state communication and respects reduced motion.

## Admin shell and information architecture

The shell retains the authenticated dashboard route group and becomes a
responsive Shadcn-style application shell:

- desktop sidebar: 288px expanded, 64px collapsed;
- mobile navigation: Sheet, not a custom overlay;
- sticky 64px header with sidebar control, contextual page title or breadcrumb,
  theme menu, and account menu;
- no fake search or command palette is shown until a real navigation/search
  capability is implemented;
- collapsed preference persists locally as presentation state only.

Navigation is grouped by capability instead of one flat list:

```text
Nội dung học
  Nội dung khóa học
    Khóa học
    Chương học
    Bài học
    Thử thách
    Đáp án
  Reading
    Passage
    Duyệt nguồn

Vận hành
  Người dùng
  Phiên luyện tập

Hệ thống
  Cài đặt
```

Parent groups expand and collapse. The active child expands its parent. In the
collapsed desktop state, grouped items are available through an accessible
Dropdown Menu or Tooltip-assisted trigger. Routes and URLs do not change.

## Reusable Admin presentation

App-wide patterns live under `apps/admin/app/components`, never inside a
business feature:

```text
components/
  data-table/
    data-table.tsx
    data-table-pagination.tsx
    data-table-toolbar.tsx
    data-table.types.ts
  feedback/
    empty-state.tsx
    error-state.tsx
    loading-state.tsx
  forms/
    form-field.tsx
    form-actions.tsx
  layout/
    AdminShell.tsx
    AdminSidebar.tsx
    AdminNavbar.tsx
    PageHeader.tsx
    admin-navigation.ts
  ui/
    ...Shadcn primitives
```

`PageHeader` owns title, description, optional eyebrow, and actions. Screens no
longer repeat border-bottom header markup.

`DataTable` uses the installed TanStack Table package for column identity,
sorting state, accessible header buttons, row rendering, and visibility-safe
composition. Server pagination, search debounce, endpoint params, and existing
React Query cache behavior remain owned by the resource screen and hooks. Rows
must use stable resource IDs rather than array indices.

Forms use React Hook Form with feature-local Zod schemas through the installed
resolver. Zod schemas remain Admin-local runtime validation and are never
promoted into Shared wire schemas. Form field components connect labels,
descriptions, errors, `aria-invalid`, and focus behavior. Server errors remain
visible after submission and do not erase user input.

Destructive actions use Alert Dialog with a named resource and explicit
destructive action. Browser `confirm()` is removed. Sonner remains the global
transient notification mechanism, but toasts do not replace inline form or
page-level errors.

## Screen decomposition and coverage

### Authentication

Login uses the same tokens and form system in a focused single-card layout. It
preserves the current Admin login endpoint and redirect behavior. Loading and
authentication checks use shared skeleton/loading presentation instead of
custom spinners and English-only copy.

### Course Management

Courses, Units, Lessons, Challenges, and Challenge Options share list-page and
editor-dialog patterns but remain independent resource Interfaces. For each
resource:

- the management screen owns query and mutation orchestration;
- a dedicated columns module owns table column definitions;
- a dedicated editor form owns React Hook Form state and validation;
- a reusable delete dialog owns confirmation presentation;
- current HTTP method, endpoint, payload, pagination, lookup, and cache-key
  behavior is preserved.

These splits stay inside the Courses capability and do not recreate an
aggregate Course Management client.

### Reading

Reading Passages retains nested question/option authoring but is decomposed into
passage list, editor dialog, passage fields, question editor, and option editor.
The form keeps the existing wire payload and A1 behavior. Correct-answer
selection uses the Radio Group primitive; level/topic fields use Select;
passage content uses Textarea.

Reading Source Candidate list and review dialog adopt the same page, table,
form, publication status, and error patterns. Source HTML remains text-only and
is never rendered with `dangerouslySetInnerHTML`.

### Users and Practice Sessions

Users moves feature behavior out of `app/views` into
`app/features/users/components`; the View remains route-level composition.
User creation/editing uses one schema with deliberate create/edit password
rules. Deletion uses Alert Dialog.

Practice Sessions keeps list, detail, and delete behavior. Its detail Dialog
uses responsive metric summaries and a scroll-safe nested table. Dates and
status badges use consistent formatter and badge variants.

### Settings

Settings becomes a capability-owned screen component below
`app/features/settings/components`, with the View acting only as route-level
composition. It uses vertical Tabs on desktop and a Select on small screens.
The initial categories are:

- Học tập;
- Ôn tập;
- Truy cập.

The form loads one effective Settings object, tracks dirty fields, saves a
partial update, disables submission when unchanged, and shows which changes
apply only to newly started sessions.

## Typed business Settings

### Settings v1 contract

Only policies that have a real runtime consumer are exposed:

| Wire field                    | Storage key                      | Default | Valid range   | Runtime owner |
| ----------------------------- | -------------------------------- | ------: | ------------- | ------------- |
| `maxHearts`                   | `MAX_HEARTS`                     |       5 | integer 1-99  | Progress      |
| `practiceWordsPerLesson`      | `PRACTICE_WORDS_PER_LESSON`      |      15 | integer 5-50  | Practice      |
| `weakWordsLimit`              | `WEAK_WORDS_LIMIT`               |      20 | integer 5-100 | Practice      |
| `dailyReviewRelaxedLimit`     | `DAILY_REVIEW_RELAXED_LIMIT`     |       5 | integer 1-50  | Review        |
| `dailyReviewStandardLimit`    | `DAILY_REVIEW_STANDARD_LIMIT`    |      15 | integer 1-100 | Review        |
| `dailyReviewAcceleratedLimit` | `DAILY_REVIEW_ACCELERATED_LIMIT` |      30 | integer 1-150 | Review        |
| `dailyReviewIntensiveLimit`   | `DAILY_REVIEW_INTENSIVE_LIMIT`   |      50 | integer 1-200 | Review        |
| `registrationEnabled`         | `REGISTRATION_ENABLED`           |    true | boolean       | Auth          |

Shared exports compile-time `SystemSettings` and
`UpdateSystemSettingsPayload` declarations from the root `@repo/shared`
Interface. Shared contains no Zod schema or persistence key registry.

API Settings owns a single typed registry that maps storage keys to defaults,
parsing, validation, and serialization. Effective reads tolerate absent rows by
using defaults. Invalid persisted values fail closed to the default and are
covered by tests; they are not silently sent to clients as arbitrary strings.

### HTTP Interface

Admin gains:

```text
GET /admin/settings
PUT /admin/settings
```

`GET` returns the complete effective `SystemSettings`. `PUT` accepts a partial
payload, validates every present field with API-local DTOs, and transactionally
upserts only the provided registered keys.

The existing per-key routes remain during migration for `MAX_HEARTS`, but the
new UI does not use them. Registered per-key writes use the same registry
validation. Unknown writes return a stable bad-request response rather than
creating arbitrary database keys. The existing `system_settings` table remains
unchanged, so no Prisma migration is needed.

### Runtime consumption

Settings exposes a small API capability Interface for other backend owners to
read effective typed values. Progress, Practice, Review, and Auth import that
public Interface rather than querying `system_settings` directly.

- Progress uses `maxHearts` for new lesson state.
- Practice uses the two practice limits when selecting items.
- Review uses the four intensity limits when composing a new daily review.
- Auth rejects new registration with a stable unavailable response when
  `registrationEnabled` is false; existing login, verification, password
  recovery, and Admin login remain available.

Settings changes do not rewrite active sessions or historical attempts.

## Data, error, and state flow

The existing frontend dependency direction remains:

```text
route -> app/views -> feature screen/hook -> resource .api.ts
      -> app/features/auth/api/admin-http-client.ts
```

Every list screen distinguishes:

- initial loading: layout-matching Skeleton;
- background fetching: non-blocking progress indication;
- empty result: Empty State with a relevant action when authorized;
- request error: inline Error State with retry;
- mutation pending: disable only conflicting actions;
- mutation failure: retain input and show a safe error;
- mutation success: update/invalidate the existing resource cache and notify
  through Sonner.

No screen introduces authenticated Server Component data fetching.

## Accessibility and responsive behavior

- All icon-only buttons have localized accessible names.
- Sorting is performed by buttons inside headers and exposes direction.
- Dialog, Alert Dialog, Dropdown Menu, Tabs, Sheet, Select, Radio Group, and
  Tooltip use their accessible primitive behavior.
- Focus rings are semantic and visible in light and dark modes.
- Status is never communicated by color alone.
- Tables scroll horizontally without clipping actions; compact mobile screens
  may switch the toolbar to a stacked layout but keep the same data.
- Dialogs have bounded viewport height, sticky action areas where needed, and
  scroll only their content region.
- Reduced-motion preferences disable nonessential transitions.

## Delivery sequence

The redesign is implemented as reviewable vertical slices:

1. styling platform, font, semantic tokens, theme, and Shadcn registry;
2. primitive set, shell, grouped navigation, and reusable page feedback;
3. Data Table, form field, form actions, and destructive confirmation patterns;
4. typed Settings end to end, proving Shared/API/Admin integration;
5. Courses resource screens, one resource at a time;
6. Reading authoring and source review;
7. Users, Practice Sessions, and Login;
8. visual consistency, dark-mode, responsive, accessibility, and dead
   dependency cleanup.

Each slice preserves a working Admin and ends with focused tests and checks.

### Implementation plan boundaries

The approved design is intentionally delivered through four dependent plans so
each review remains small enough to reject or accept independently:

1. **Admin UI foundation:** Tailwind/Shadcn baseline, global tokens, font,
   theme, primitives, shell, navigation, page feedback, Data Table, and form
   patterns.
2. **Typed business Settings:** Shared contract, API registry and consumers,
   Admin Settings resource/form, and canonical documentation.
3. **Course Management restyle:** Courses, Units, Lessons, Challenges, and
   Challenge Options migrated resource by resource onto the foundation.
4. **Remaining route restyle and visual QA:** Reading, source candidates,
   Users, Practice Sessions, Login, responsive/dark/accessibility audit, and
   dependency cleanup.

Plan 2-4 consume the public UI patterns produced by Plan 1. They do not create
parallel primitive variants. This dependency order also keeps the Admin usable
between plans.

## Verification

Focused development uses the owning workspace tests and checks. The design
requires coverage for:

- Shadcn/Tailwind source placement and `@source` scanning;
- semantic primitive imports and forbidden native/browser confirmation usage;
- stable Admin routes, HTTP methods, payloads, query keys, and pagination;
- typed Settings defaults, parsing, ranges, partial transaction updates,
  unknown-key rejection, and each runtime consumer;
- form validation and create/edit differences;
- table sorting/pagination behavior and stable row identity;
- Reading nested authoring invariants and source HTML safety;
- theme hydration and light/dark rendering contracts where testable without
  snapshotting implementation details.

Before handoff, run the repository gates documented in
`docs/guides/verification.md`:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

No verification step may seed, migrate, reset, synchronize vocabulary, or call
an external provider.

## Documentation impact

The implementation updates the canonical owners in the same change:

- `docs/architecture/frontend.md` for the Admin Shadcn/Tailwind profile,
  component ownership, theme, and screen placement;
- `docs/architecture/api.md` for typed Settings ownership and cross-capability
  consumption;
- `docs/guides/environment-configuration.md` to make the boundary between
  runtime business Settings and deploy-time environment/secrets explicit;
- `docs/guides/verification.md` if focused Admin UI or Settings commands change.

No new ADR is required unless implementation discovers a durable package or
public Interface decision that contradicts the accepted architecture rather
than applying it.

## Acceptance criteria

- Every existing Admin route uses the approved 400/500/600 typography hierarchy
  and semantic tokens.
- Admin has a working light, dark, and system theme without hard-coded light
  surfaces.
- Desktop and mobile navigation expose all existing routes through grouped,
  accessible controls.
- No feature screen uses browser `confirm()` or raw select/textarea/radio
  styling.
- Course, Reading, Users, Practice, Settings, and Login preserve their current
  observable behavior except for the explicitly added typed Settings behavior.
- Settings exposes exactly the eight approved safe policies, validates them at
  API and Admin boundaries, and affects only their named runtime consumers.
- No secret or deploy-time environment value is readable or writable from the
  Settings UI.
- Oversized screens are split by responsibility while routes remain thin and
  feature ownership remains capability-first.
- Focused and full verification gates pass without a database or provider
  write.
