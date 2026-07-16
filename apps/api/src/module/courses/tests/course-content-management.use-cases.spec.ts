import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseContentManagementUseCases } from "../use-cases/course-content-management.use-cases";

type Call = {
  resource: string;
  operation: string;
  arguments: unknown;
};

const fixtures = {
  courses: { id: 1, title: "English", image_src: "/en.svg" },
  units: {
    id: 2,
    title: "Basics",
    description: "Start here",
    course_id: 1,
    order: 1,
  },
  lessons: { id: 3, title: "Greetings", unit_id: 2, order: 1 },
  challenges: {
    id: 4,
    lesson_id: 3,
    type: "SELECT",
    question: "Hello?",
    order: 1,
    vocabulary_item_id: null,
    direction: null,
  },
  challenge_options: {
    id: 5,
    challenge_id: 4,
    text: "Hello",
    correct: true,
    image_src: null,
    audio_src: null,
  },
} as const;

type Resource = keyof typeof fixtures;

const createPrisma = (missing = false) => {
  const calls: Call[] = [];

  const delegate = (resource: Resource) => ({
    findMany(arguments_: unknown) {
      calls.push({ resource, operation: "findMany", arguments: arguments_ });
      return Promise.resolve([fixtures[resource]]);
    },
    count(arguments_: unknown) {
      calls.push({ resource, operation: "count", arguments: arguments_ });
      return Promise.resolve(7);
    },
    findUnique(arguments_: unknown) {
      calls.push({ resource, operation: "findUnique", arguments: arguments_ });
      return Promise.resolve(missing ? null : fixtures[resource]);
    },
    create(arguments_: unknown) {
      calls.push({ resource, operation: "create", arguments: arguments_ });
      return Promise.resolve(fixtures[resource]);
    },
    update(arguments_: unknown) {
      calls.push({ resource, operation: "update", arguments: arguments_ });
      return Promise.resolve(fixtures[resource]);
    },
    delete(arguments_: unknown) {
      calls.push({ resource, operation: "delete", arguments: arguments_ });
      return Promise.resolve(fixtures[resource]);
    },
  });

  const prisma = {
    courses: delegate("courses"),
    units: delegate("units"),
    lessons: delegate("lessons"),
    challenges: delegate("challenges"),
    challenge_options: delegate("challenge_options"),
  } as unknown as PrismaService;

  return { prisma, calls };
};

test("service forwards list/count queries and maps every managed resource", async () => {
  const { prisma, calls } = createPrisma();
  const service = new CourseContentManagementUseCases(prisma);
  const query = { where: { id: 1 }, skip: 0, take: 10, orderBy: [] };

  assert.deepEqual(await service.listCourses(query), [
    { id: 1, title: "English", imageSrc: "/en.svg" },
  ]);
  assert.deepEqual(await service.listUnits(query), [
    {
      id: 2,
      title: "Basics",
      description: "Start here",
      courseId: 1,
      order: 1,
    },
  ]);
  assert.deepEqual(await service.listLessons(query), [
    { id: 3, title: "Greetings", unitId: 2, order: 1 },
  ]);
  assert.deepEqual(await service.listChallenges(query), [
    {
      id: 4,
      lessonId: 3,
      type: "SELECT",
      question: "Hello?",
      order: 1,
      vocabularyItemId: null,
      direction: null,
    },
  ]);
  assert.deepEqual(await service.listChallengeOptions(query), [
    {
      id: 5,
      challengeId: 4,
      text: "Hello",
      correct: true,
      imageSrc: null,
      audioSrc: null,
    },
  ]);
  assert.equal(await service.countCourses({ title: "English" }), 7);

  assert.deepEqual(calls[0], {
    resource: "courses",
    operation: "findMany",
    arguments: query,
  });
  assert.deepEqual(calls.at(-1), {
    resource: "courses",
    operation: "count",
    arguments: { where: { title: "English" } },
  });
});

test("service preserves exact not-found messages", async () => {
  const { prisma } = createPrisma(true);
  const service = new CourseContentManagementUseCases(prisma);

  const cases: Array<[() => Promise<unknown>, string]> = [
    [() => service.getCourse(11), "Course with ID 11 not found"],
    [() => service.getUnit(12), "Unit with ID 12 not found"],
    [() => service.getLesson(13), "Lesson with ID 13 not found"],
    [() => service.getChallenge(14), "Challenge with ID 14 not found"],
    [
      () => service.getChallengeOption(15),
      "Challenge option with ID 15 not found",
    ],
  ];

  for (const [operation, expectedMessage] of cases) {
    await assert.rejects(operation, (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, expectedMessage);
      return true;
    });
  }
});

test("service preserves write mapping and direct Prisma delete behavior", async () => {
  const { prisma, calls } = createPrisma();
  const service = new CourseContentManagementUseCases(prisma);

  await service.createCourse({ title: "English", imageSrc: "/en.svg" });
  await service.updateUnit(2, { courseId: 9 });
  await service.createLesson({ title: "Greetings", unitId: 2, order: 1 });
  await service.createChallenge({
    lessonId: 3,
    type: "SELECT",
    question: "Hello?",
    order: 1,
  });
  await service.updateChallenge(4, {
    vocabularyItemId: null,
    direction: null,
  });
  await service.createChallengeOption({
    challengeId: 4,
    text: "Hello",
    correct: true,
  });
  await service.updateChallengeOption(5, {
    imageSrc: null,
    audioSrc: null,
  });
  await service.deleteCourse(1);
  await service.deleteUnit(2);
  await service.deleteLesson(3);
  await service.deleteChallenge(4);
  await service.deleteChallengeOption(5);

  assert.deepEqual(
    calls.filter(
      (call) => call.operation === "create" || call.operation === "update"
    ),
    [
      {
        resource: "courses",
        operation: "create",
        arguments: { data: { title: "English", image_src: "/en.svg" } },
      },
      {
        resource: "units",
        operation: "update",
        arguments: { where: { id: 2 }, data: { course_id: 9 } },
      },
      {
        resource: "lessons",
        operation: "create",
        arguments: {
          data: { title: "Greetings", unit_id: 2, order: 1 },
        },
      },
      {
        resource: "challenges",
        operation: "create",
        arguments: {
          data: {
            lesson_id: 3,
            type: "SELECT",
            question: "Hello?",
            order: 1,
            vocabulary_item_id: null,
            direction: null,
          },
        },
      },
      {
        resource: "challenges",
        operation: "update",
        arguments: {
          where: { id: 4 },
          data: { vocabulary_item_id: null, direction: null },
        },
      },
      {
        resource: "challenge_options",
        operation: "create",
        arguments: {
          data: {
            challenge_id: 4,
            text: "Hello",
            correct: true,
            image_src: null,
            audio_src: null,
          },
        },
      },
      {
        resource: "challenge_options",
        operation: "update",
        arguments: {
          where: { id: 5 },
          data: { image_src: null, audio_src: null },
        },
      },
    ]
  );

  assert.deepEqual(
    calls.filter((call) => call.operation === "delete"),
    [
      {
        resource: "courses",
        operation: "delete",
        arguments: { where: { id: 1 } },
      },
      {
        resource: "units",
        operation: "delete",
        arguments: { where: { id: 2 } },
      },
      {
        resource: "lessons",
        operation: "delete",
        arguments: { where: { id: 3 } },
      },
      {
        resource: "challenges",
        operation: "delete",
        arguments: { where: { id: 4 } },
      },
      {
        resource: "challenge_options",
        operation: "delete",
        arguments: { where: { id: 5 } },
      },
    ]
  );
});
