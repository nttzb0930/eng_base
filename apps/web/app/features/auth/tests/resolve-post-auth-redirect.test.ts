import assert from "node:assert/strict";
import { test } from "node:test";

import type { UserProgress } from "@repo/shared";

import { resolvePostAuthRedirect } from "../routing/resolve-post-auth-redirect";

const confirmedProgress = {
  userId: "user-1",
  userName: "Learner",
  userImageSrc: "/mascot.svg",
  activeCourseId: 1,
  hearts: 5,
  points: 0,
  activeCourse: {
    id: 1,
    code: "english-vocabulary",
    title: "English Vocabulary",
    imageSrc: "/mascot.svg",
  },
  isPlacementTestConfirmed: true,
  primaryLanguage: "en",
} satisfies UserProgress;

test("post-auth redirect sends confirmed learners to dashboard", () => {
  assert.equal(resolvePostAuthRedirect(confirmedProgress), "/dashboard");
});

test("post-auth redirect sends new learners to placement test", () => {
  assert.equal(
    resolvePostAuthRedirect({
      ...confirmedProgress,
      activeCourse: null,
      activeCourseId: null,
      isPlacementTestConfirmed: false,
    }),
    "/placement-test"
  );
});

test("post-auth redirect sends confirmed learners without an active course to course selection", () => {
  assert.equal(
    resolvePostAuthRedirect({
      ...confirmedProgress,
      activeCourse: null,
      activeCourseId: null,
    }),
    "/courses"
  );
});

test("post-auth redirect treats missing progress as placement-required", () => {
  assert.equal(resolvePostAuthRedirect(null), "/placement-test");
});
