import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateAdminCourseUseCase } from "../use-cases/create-admin-course.use-case";
import { GetAdminCourseUseCase } from "../use-cases/get-admin-course.use-case";
import { ListAdminCoursesUseCase } from "../use-cases/list-admin-courses.use-case";
import { UpdateAdminUnitUseCase } from "../use-cases/update-admin-unit.use-case";

const createPrisma = (missing = false) => {
  const calls: Array<{ operation: string; arguments: unknown }> = [];
  const courses = {
    findMany(arguments_: unknown) {
      calls.push({ operation: "findMany", arguments: arguments_ });
      return Promise.resolve([
        {
          id: 1,
          code: "english-vocabulary",
          title: "English",
          image_src: "/en.svg",
        },
      ]);
    },
    count(arguments_: unknown) {
      calls.push({ operation: "count", arguments: arguments_ });
      return Promise.resolve(7);
    },
    findUnique(arguments_: unknown) {
      calls.push({ operation: "findUnique", arguments: arguments_ });
      return Promise.resolve(
        missing
          ? null
          : {
              id: 1,
              code: "english-vocabulary",
              title: "English",
              image_src: "/en.svg",
            }
      );
    },
    create(arguments_: unknown) {
      calls.push({ operation: "create", arguments: arguments_ });
      return Promise.resolve({
        id: 1,
        code: "english-vocabulary",
        title: "English",
        image_src: "/en.svg",
      });
    },
  };
  const units = {
    update(arguments_: unknown) {
      calls.push({ operation: "update", arguments: arguments_ });
      return Promise.resolve({
        id: 2,
        title: "Basics",
        description: "Start here",
        course_id: 9,
        order: 1,
      });
    },
  };

  return {
    prisma: { courses, units } as unknown as PrismaService,
    calls,
  };
};

test("course content exposes exactly 25 goal-named use-case classes", () => {
  const root = join(__dirname, "../use-cases");
  const files = readdirSync(root).filter((file) =>
    /^(list|get|create|update|remove)-admin-.*\.use-case\.ts$/.test(file)
  );

  assert.equal(files.length, 25);
  assert.equal(
    existsSync(join(root, "course-content-management.use-cases.ts")),
    false
  );
});

test("list use case maps data and owns optional count coordination", async () => {
  const { prisma, calls } = createPrisma();
  const useCase = new ListAdminCoursesUseCase(prisma);
  const query = {
    filters: { id: 1 },
    offset: 0,
    limit: 10,
    sort: [],
  };

  assert.deepEqual(await useCase.execute(query, true), {
    data: [
      {
        id: 1,
        code: "english-vocabulary",
        title: "English",
        imageSrc: "/en.svg",
      },
    ],
    total: 7,
  });
  assert.deepEqual(calls, [
    {
      operation: "findMany",
      arguments: { where: query.filters, skip: 0, take: 10, orderBy: [] },
    },
    { operation: "count", arguments: { where: query.filters } },
  ]);
});

test("get use case preserves the not-found behavior", async () => {
  const { prisma } = createPrisma(true);
  const useCase = new GetAdminCourseUseCase(prisma);

  await assert.rejects(
    () => useCase.execute(11),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.equal(error.message, "Course with ID 11 not found");
      return true;
    }
  );
});

test("write use cases preserve DTO-to-Prisma mapping", async () => {
  const { prisma, calls } = createPrisma();

  await new CreateAdminCourseUseCase(prisma).execute({
    code: "english-vocabulary",
    title: "English",
    imageSrc: "/en.svg",
  });
  await new UpdateAdminUnitUseCase(prisma).execute(2, { courseId: 9 });

  assert.deepEqual(calls, [
    {
      operation: "create",
      arguments: {
        data: {
          code: "english-vocabulary",
          title: "English",
          image_src: "/en.svg",
        },
      },
    },
    {
      operation: "update",
      arguments: { where: { id: 2 }, data: { course_id: 9 } },
    },
  ]);
});
