import assert from "node:assert/strict";
import test from "node:test";

import {
  CourseLessonDtoSchema,
  CourseDtoSchema,
  CourseManagementPageQuerySchema,
  CourseUnitDtoSchema,
  CreateLessonChallengeOptionRequestSchema,
  CreateLessonChallengeRequestSchema,
  LessonChallengeDtoSchema,
  LessonChallengeOptionDtoSchema,
  PaginatedCourseUnitsDtoSchema,
} from "@repo/shared/courses";

test("course contract accepts the existing admin wire shape", () => {
  assert.deepEqual(
    CourseDtoSchema.parse({ id: 1, title: "English", imageSrc: "/en.svg" }),
    { id: 1, title: "English", imageSrc: "/en.svg" }
  );

  assert.deepEqual(
    LessonChallengeDtoSchema.parse({
      id: 10,
      lessonId: 2,
      type: "SELECT",
      direction: "EN_TO_VI",
      question: "What does bear mean?",
      order: 1,
      vocabularyItemId: 7,
    }).type,
    "SELECT"
  );

  assert.equal(
    CourseUnitDtoSchema.parse({
      id: 2,
      title: "Basics",
      description: "A1",
      courseId: 1,
      order: 1,
    }).courseId,
    1
  );
  assert.equal(
    CourseLessonDtoSchema.parse({
      id: 3,
      title: "Animals",
      unitId: 2,
      order: 1,
    }).unitId,
    2
  );
  assert.equal(
    LessonChallengeOptionDtoSchema.parse({
      id: 4,
      challengeId: 10,
      text: "Bear",
      correct: true,
      imageSrc: null,
      audioSrc: null,
    }).correct,
    true
  );
});

test("course contract requires camelCase fields and strips unknown fields", () => {
  assert.throws(() =>
    CourseDtoSchema.parse({ id: 1, title: "English", image_src: "/en.svg" })
  );

  assert.deepEqual(
    CourseDtoSchema.parse({
      id: 1,
      title: "English",
      imageSrc: "/en.svg",
      image_src: "/private-storage-name.svg",
    }),
    { id: 1, title: "English", imageSrc: "/en.svg" }
  );
});

test("paginated course contract requires stable pagination metadata", () => {
  const result = PaginatedCourseUnitsDtoSchema.parse({
    data: [
      {
        id: 4,
        title: "A1 Vocabulary",
        description: "Beginner words",
        courseId: 1,
        order: 1,
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  });

  assert.equal(result.data[0]?.courseId, 1);

  assert.deepEqual(
    PaginatedCourseUnitsDtoSchema.parse({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    }).data,
    []
  );
});

test("request and query schemas match the producer boundary", () => {
  assert.deepEqual(
    CreateLessonChallengeRequestSchema.parse({
      lessonId: 2,
      type: "ASSIST",
      question: "Complete the sentence",
      order: 1,
    }),
    {
      lessonId: 2,
      type: "ASSIST",
      question: "Complete the sentence",
      order: 1,
    }
  );

  assert.throws(() =>
    CourseManagementPageQuerySchema.parse({ page: 1, search: "bear" })
  );

  assert.deepEqual(
    CreateLessonChallengeOptionRequestSchema.parse({
      challengeId: 10,
      text: "Bear",
      correct: true,
    }),
    { challengeId: 10, text: "Bear", correct: true }
  );

  assert.throws(() =>
    LessonChallengeDtoSchema.parse({
      id: 10,
      lessonId: 2,
      type: "FREE_TEXT",
      direction: null,
      question: "Unsupported type",
      order: 1,
      vocabularyItemId: null,
    })
  );
});
