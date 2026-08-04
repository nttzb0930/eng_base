# Practice Session Layout Design

## Goal

Give active Practice sessions the same focused, full-viewport presentation model as Lesson sessions. The global Learner navigation remains available on the Practice landing page, but it must not consume space or compete with the session controls while a learner is answering questions.

## Route ownership

Keep the Practice landing page in the main Learner route group and move only active quiz routes into a route group dedicated to sessions:

```text
apps/web/app/[locale]/
  (main)/
    practice/
      page.tsx
  (session)/
    layout.tsx
    practice/
      fill-blank/page.tsx
      listening/page.tsx
      dictation/page.tsx
      weak-words/page.tsx
```

Next.js route groups do not alter public URLs. Existing localized paths such as `/vi/practice/fill-blank` remain unchanged.

## Layout behavior

`(main)` continues to render the global desktop Header, Mobile Header, page container, and scroll-to-top control.

`(session)` renders `LearnerShell` in a generic `session` mode. Session mode:

- authenticates the learner and enforces placement confirmation through the existing guards;
- fills the dynamic viewport with a single overflow owner;
- does not render global navigation, the main page container, or the scroll-to-top control;
- lets the owning capability render its focused session controls.

Rename the current `LearnerShell` mode from `lesson` to `session`, because both Lesson and Practice consume the same layout behavior. The existing Lesson route adopts the renamed mode without changing its URL or quiz behavior.

## Practice presentation

`PracticeSessionShell` remains the owner of the active Practice header:

- exit action;
- progress bar;
- current and total question count.

Its root uses the available session viewport directly rather than subtracting approximate global-header and page-padding heights. The question region owns internal scrolling, while the answer footer remains visible.

The Practice landing page keeps global navigation because it is a browsing and mode-selection screen, not an active learning session.

## Data and state

The route move is presentation-only. It does not change:

- Practice API requests or response types;
- React Query keys or cache behavior;
- learning-session state and scoring;
- localized URLs or navigation targets;
- exit confirmation behavior.

Moving between main and session route groups may remount the screen, which is expected when starting or leaving a Practice session.

## Failure and responsive behavior

Authentication and placement fallbacks continue to come from `LearnerShell`. Practice loading routes move with their corresponding session pages so the focused skeleton does not briefly show global navigation.

Desktop and mobile both use the same session ownership. The layout relies on `100dvh` through `LearnerShell`; the question body scrolls when content exceeds the available height, and the session header and footer remain fixed in the flex layout.

## Verification

- Architecture test confirms the Practice landing page stays under `(main)` and active Practice routes live under `(session)`.
- Architecture test confirms Lesson and the new session route group use `LearnerShell` session mode.
- Existing Practice and Learning Session behavior tests continue to pass.
- Web type-check, lint, and production build pass.
- Manual checks cover desktop and mobile viewport heights, starting a Practice mode, exiting it, and completing a session.

## Out of scope

- Changing Practice questions, scoring, or API behavior.
- Redesigning the Practice landing page.
- Adding resumable Practice sessions.
- Removing the compact Practice session header.
