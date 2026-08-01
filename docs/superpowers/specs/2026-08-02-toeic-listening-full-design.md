# TOEIC Listening Full mode

## Goal

Add a dedicated Full Listening experience while retaining the established Check
and Dictation experiences. Learners can listen without answering, inspect or
hide the transcript, read the Vietnamese translation, and move directly to a
question within the current lesson.

## Boundaries

- No database migration or new content contract is required. Full mode uses the
  existing audio, transcript, translation, and question ordering data.
- The existing timeline player remains available in Check and Dictation. It is
  not redesigned as part of this work.
- The existing lesson sidebar remains visible.

## Shared listening interface

The three modes share audio state and navigation:

- current question and previous/next navigation;
- play/pause, restart, playback speed, volume, and autoplay;
- question list and per-account progress source.

The implementation exposes these as focused reusable components rather than
duplicating state in each mode.

## Full mode

Full mode receives a dedicated player surface with:

- previous, large play/pause, and next controls;
- `Câu n / total` status;
- restart, autoplay toggle, transcript visibility toggle, and speed control;
- automatic playback when a learner changes question while autoplay is enabled;
- a transcript card showing the English transcript and italic Vietnamese
  translation when script visibility is enabled;
- a selectable question-number card with the active item styled using the
  existing primary token.

The default state is autoplay enabled and transcript visible, matching the
reference screen. Playback speed cycles through 0.75x, 1x, 1.25x, and 1.5x.

## Component ownership

- `app/features/toeic-dictation/components` owns reusable listening controls and
  the Full player.
- `app/views/toeic-listening/ToeicDictationSessionView.tsx` remains the route
  composition owner, loading data and selecting the mode-specific surface.

## Error and accessibility behavior

- Buttons carry descriptive accessible names and retain keyboard focus states.
- Loading and unavailable media use the current error handling rather than
  pretending that playback is active.
- Transcript hiding affects presentation only; it does not mutate learning or
  progress data.

## Verification

- Add targeted component or view tests for Full mode navigation and script
  visibility.
- Run Web typecheck, lint, and focused tests.
