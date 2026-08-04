import assert from "node:assert/strict";
import test from "node:test";

import { ENGLISH_VOCABULARY_COURSE_CODE } from "../course.constants";
import { GetUserProgressUseCase } from "../use-cases/get-user-progress.use-case";

test("confirmed learners without an active course are repaired to the default English course", async () => {
  const defaultCourse = {
    id: 7,
    code: ENGLISH_VOCABULARY_COURSE_CODE,
    title: "English Vocabulary",
    image_src: "/mascot.svg",
  };
  const storedProgress = {
    user_id: "user-1",
    user_name: "Learner",
    user_image_src: "/mascot.svg",
    active_course_id: null,
    hearts: 5,
    points: 0,
    primary_language: "en",
    courses: null,
  };
  let courseLookup: unknown;
  let progressUpdate: unknown;
  const prisma = {
    user_progress: {
      findUnique: async () => storedProgress,
      update: async (arguments_: {
        data: { active_course_id: number };
      }) => {
        progressUpdate = arguments_;
        return {
          ...storedProgress,
          active_course_id: arguments_.data.active_course_id,
          courses: defaultCourse,
        };
      },
    },
    placement_test_sessions: {
      findUnique: async () => ({ status: "CONFIRMED" }),
    },
    courses: {
      findFirst: async (arguments_: unknown) => {
        courseLookup = arguments_;
        return defaultCourse;
      },
    },
  };

  const result = await new GetUserProgressUseCase(prisma as never).execute(
    "user-1"
  );

  assert.deepEqual(courseLookup, {
    where: { code: ENGLISH_VOCABULARY_COURSE_CODE },
  });
  assert.deepEqual(progressUpdate, {
    where: { user_id: "user-1" },
    data: { active_course_id: defaultCourse.id },
    include: { courses: true },
  });
  assert.equal(result.activeCourseId, defaultCourse.id);
  assert.equal(result.activeCourse?.code, ENGLISH_VOCABULARY_COURSE_CODE);
});

test("confirmed learners without stored progress are created with the default English course", async () => {
  const defaultCourse = {
    id: 7,
    code: ENGLISH_VOCABULARY_COURSE_CODE,
    title: "English Vocabulary",
    image_src: "/mascot.svg",
  };
  let progressUpsert: unknown;
  const prisma = {
    user_progress: {
      findUnique: async () => null,
      upsert: async (arguments_: {
        create: { active_course_id: number | null };
      }) => {
        progressUpsert = arguments_;
        return {
          user_id: "user-1",
          user_name: "Learner",
          user_image_src: "/mascot.svg",
          active_course_id: arguments_.create.active_course_id,
          hearts: 5,
          points: 0,
          primary_language: "en",
          courses: defaultCourse,
        };
      },
    },
    placement_test_sessions: {
      findUnique: async () => ({ status: "CONFIRMED" }),
    },
    courses: {
      findFirst: async () => defaultCourse,
    },
    users: {
      findUnique: async () => ({
        username: "learner",
        full_name: "Learner",
      }),
    },
  };

  const result = await new GetUserProgressUseCase(prisma as never).execute(
    "user-1"
  );

  assert.equal(
    (progressUpsert as { create: { active_course_id: number | null } }).create
      .active_course_id,
    defaultCourse.id
  );
  assert.equal(result.activeCourseId, defaultCourse.id);
});
