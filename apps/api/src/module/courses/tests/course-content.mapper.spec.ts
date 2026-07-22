import assert from "node:assert/strict";
import test from "node:test";
import type {
  Course,
  CourseLesson,
  CourseUnit,
  LessonChallenge,
  LessonChallengeOption,
} from "@repo/shared";

import {
  mapChallenge,
  mapChallengeOption,
  mapCourse,
  mapLesson,
  mapUnit,
  toChallengeCreateData,
  toChallengeData,
  toChallengeOptionCreateData,
  toChallengeOptionData,
  toCourseCreateData,
  toCourseData,
  toLessonCreateData,
  toLessonData,
  toUnitCreateData,
  toUnitData,
} from "../mappers/course-content.mapper";

test("persistence mappers expose the existing camelCase course-management contract", () => {
  const expectedCourse = {
    id: 1,
    code: "english-vocabulary",
    title: "English",
    imageSrc: "/english.svg",
  } satisfies Course;
  assert.deepEqual(
    mapCourse({
      id: 1,
      code: "english-vocabulary",
      title: "English",
      image_src: "/english.svg",
    } as Parameters<typeof mapCourse>[0]),
    expectedCourse
  );

  const expectedUnit = {
    id: 2,
    title: "Basics",
    description: "Start here",
    courseId: 1,
    order: 3,
    cefrLevel: "A1",
  } satisfies CourseUnit;
  assert.deepEqual(
    mapUnit({
      id: 2,
      title: "Basics",
      description: "Start here",
      course_id: 1,
      order: 3,
      cefr_level: "A1",
    } as Parameters<typeof mapUnit>[0]),
    expectedUnit
  );

  const expectedLesson = {
    id: 4,
    title: "Greetings",
    unitId: 2,
    order: 5,
  } satisfies CourseLesson;
  assert.deepEqual(
    mapLesson({
      id: 4,
      title: "Greetings",
      unit_id: 2,
      order: 5,
    } as Parameters<typeof mapLesson>[0]),
    expectedLesson
  );

  const expectedChallenge = {
    id: 6,
    lessonId: 4,
    type: "SELECT",
    question: "Hello?",
    order: 7,
    vocabularyItemId: null,
    direction: "EN_TO_VI",
  } satisfies LessonChallenge;
  assert.deepEqual(
    mapChallenge({
      id: 6,
      lesson_id: 4,
      type: "SELECT",
      question: "Hello?",
      order: 7,
      vocabulary_item_id: null,
      direction: "EN_TO_VI",
    } as Parameters<typeof mapChallenge>[0]),
    expectedChallenge
  );

  const expectedOption = {
    id: 8,
    challengeId: 6,
    text: "Hello",
    correct: true,
    imageSrc: null,
    audioSrc: "/hello.mp3",
  } satisfies LessonChallengeOption;
  assert.deepEqual(
    mapChallengeOption({
      id: 8,
      challenge_id: 6,
      text: "Hello",
      correct: true,
      image_src: null,
      audio_src: "/hello.mp3",
    } as Parameters<typeof mapChallengeOption>[0]),
    expectedOption
  );
});

test("write mappers preserve the existing snake_case persistence seam", () => {
  assert.deepEqual(
    toCourseCreateData({
      code: "english-vocabulary",
      title: "English",
      imageSrc: "/english.svg",
    }),
    {
      code: "english-vocabulary",
      title: "English",
      image_src: "/english.svg",
    }
  );
  assert.deepEqual(toCourseData({ imageSrc: "/new.svg" }), {
    image_src: "/new.svg",
  });
  assert.deepEqual(
    toUnitCreateData({
      title: "Basics",
      description: "Start here",
      courseId: 1,
      order: 2,
      cefrLevel: "A1",
    }),
    {
      title: "Basics",
      description: "Start here",
      course_id: 1,
      order: 2,
      cefr_level: "A1",
    }
  );
  assert.deepEqual(toUnitData({ courseId: 3 }), { course_id: 3 });
  assert.deepEqual(toUnitData({ cefrLevel: null }), { cefr_level: null });
  assert.deepEqual(
    toLessonCreateData({ title: "Greetings", unitId: 2, order: 1 }),
    { title: "Greetings", unit_id: 2, order: 1 }
  );
  assert.deepEqual(toLessonData({ unitId: 9 }), { unit_id: 9 });
});

test("challenge writes distinguish omitted values from explicit null", () => {
  assert.deepEqual(
    toChallengeCreateData({
      lessonId: 1,
      type: "ASSIST",
      question: "Translate",
      order: 2,
    }),
    {
      lesson_id: 1,
      type: "ASSIST",
      question: "Translate",
      order: 2,
      vocabulary_item_id: null,
      direction: null,
    }
  );
  assert.deepEqual(toChallengeData({}), {});
  assert.deepEqual(
    toChallengeData({ vocabularyItemId: null, direction: null }),
    { vocabulary_item_id: null, direction: null }
  );

  assert.deepEqual(
    toChallengeOptionCreateData({
      challengeId: 1,
      text: "Answer",
      correct: false,
    }),
    {
      challenge_id: 1,
      text: "Answer",
      correct: false,
      image_src: null,
      audio_src: null,
    }
  );
  assert.deepEqual(toChallengeOptionData({}), {});
  assert.deepEqual(toChallengeOptionData({ imageSrc: null, audioSrc: null }), {
    image_src: null,
    audio_src: null,
  });
});
