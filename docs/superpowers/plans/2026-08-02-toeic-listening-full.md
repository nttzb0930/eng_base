# TOEIC Listening Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a dedicated, accessible Full Listening player with autoplay, transcript control, and direct question navigation.

**Architecture:** `ToeicDictationFullPlayer` owns the audio element and Full-mode controls. The session view remains responsible for data queries and selecting the active item. Check and Dictation continue to use `CompactAudioPlayer` unchanged.

**Tech Stack:** Next.js client components, React, TypeScript, Tailwind CSS, existing shadcn primitives, lucide-react.

## Global Constraints

- Retain the existing Check and Dictation timeline player and keyboard behavior.
- Use existing Full item and media endpoints; add no database migration or new server Interface.
- Keep controls keyboard-accessible, localized, and styled with the existing token system.
- Keep the focused session sidebar intact.

---

### Task 1: Add Full player presentation component

**Files:**
- Create: `apps/web/app/features/toeic-dictation/components/ToeicDictationFullPlayer.tsx`

**Consumes:** Blob media URL, current item position, transcript, translation, callbacks for changing items.

**Produces:** `ToeicDictationFullPlayer`, a mode-local player that manages playback state, autoplay, transcript visibility, and speed.

- [ ] **Step 1: Implement `ToeicDictationFullPlayer`** with a hidden audio element, previous/play-next controls, restart, autoplay, script visibility, speed cycling, transcript card, and question list card.
- [ ] **Step 2: Run `pnpm --filter @repo/web check-types`** to validate the component contract. The Web workspace has no React renderer test dependency, so adding one is outside this focused UI change.
- [ ] **Step 3: Commit** the component with `feat: add TOEIC full listening player`.

### Task 2: Compose the Full player from the listening session

**Files:**
- Modify: `apps/web/app/views/toeic-listening/ToeicDictationSessionView.tsx`
- Modify: `apps/web/app/messages/en.json`
- Modify: `apps/web/app/messages/vi.json`

**Consumes:** `ToeicDictationFullPlayer`, existing active item and media blob URL, current Full item query.

**Produces:** Full mode without the shared timeline/player chrome; Check and Dictation retain their current composition.

- [ ] **Step 1: Add translations** for Full controls: autoplay state, show/hide script, speed, restart, transcript list and question number.
- [ ] **Step 2: Replace the current Full conditional** with `ToeicDictationFullPlayer`, passing current index, all set items, Full query data, media URL, and safe index callbacks.
- [ ] **Step 3: Keep `CompactAudioPlayer` and its ref exclusively for Check and Dictation** so current Dictation replay shortcuts cannot regress.
- [ ] **Step 4: Run `pnpm --filter @repo/web check-types`** and correct all prop/type errors.
- [ ] **Step 5: Commit** the composition and localizations with `feat: compose TOEIC full listening mode`.

### Task 3: Verify regression safety

**Files:**
- Verify only.

- [ ] **Step 1: Run focused Web tests** with `pnpm test:web`.
- [ ] **Step 2: Run `pnpm --filter @repo/web check-types` and `pnpm --filter @repo/web lint`**.
- [ ] **Step 3: Run `git diff --check`** and inspect `git status --short` so unrelated work remains uncommitted.
