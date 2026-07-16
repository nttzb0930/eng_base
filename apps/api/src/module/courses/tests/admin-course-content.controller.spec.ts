import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import type { Response } from "express";

import { AdminJwtGuard } from "../../../common/guards/admin-jwt.guard";
import type { FilterParseResult } from "../../../common/decorators/filter-parse.decorator";
import { AdminChallengeOptionsController } from "../admin-challenge-options.controller";
import { AdminChallengesController } from "../admin-challenges.controller";
import { AdminCoursesController } from "../admin-courses.controller";
import { AdminLessonsController } from "../admin-lessons.controller";
import { AdminUnitsController } from "../admin-units.controller";
import { sendAdminListResponse } from "../../../common/http/admin-list-response";

type ManagementQuery = FilterParseResult<Record<string, unknown>>;

const controllers = [
  AdminCoursesController,
  AdminUnitsController,
  AdminLessonsController,
  AdminChallengesController,
  AdminChallengeOptionsController,
];

const createResponse = () => {
  const result: { headers: Record<string, string>; body?: unknown } = {
    headers: {},
  };
  const response = {
    setHeader(name: string, value: string) {
      result.headers[name] = value;
      return response;
    },
    json(body: unknown) {
      result.body = body;
      return response;
    },
  } as unknown as Response;
  return { response, result };
};

test("focused controllers preserve the exact 25 admin course-content routes", () => {
  const routes = controllers
    .flatMap((controller) => {
      const controllerPath = Reflect.getMetadata(
        PATH_METADATA,
        controller
      ) as string;
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        controller
      ) as unknown[];
      assert.ok(guards.includes(AdminJwtGuard));

      return Object.getOwnPropertyNames(controller.prototype).flatMap(
        (property) => {
          const handler = Object.getOwnPropertyDescriptor(
            controller.prototype,
            property
          )?.value as unknown;
          if (typeof handler !== "function") return [];

          const path = Reflect.getMetadata(PATH_METADATA, handler) as
            string | undefined;
          const method = Reflect.getMetadata(METHOD_METADATA, handler) as
            RequestMethod | undefined;
          if (path === undefined || method === undefined) return [];

          const suffix = path === "/" ? "" : `/${path}`;
          return [`${RequestMethod[method]} /${controllerPath}${suffix}`];
        }
      );
    })
    .sort();

  assert.deepEqual(routes, [
    "DELETE /admin/challengeOptions/:id",
    "DELETE /admin/challenges/:id",
    "DELETE /admin/courses/:id",
    "DELETE /admin/lessons/:id",
    "DELETE /admin/units/:id",
    "GET /admin/challengeOptions",
    "GET /admin/challengeOptions/:id",
    "GET /admin/challenges",
    "GET /admin/challenges/:id",
    "GET /admin/courses",
    "GET /admin/courses/:id",
    "GET /admin/lessons",
    "GET /admin/lessons/:id",
    "GET /admin/units",
    "GET /admin/units/:id",
    "POST /admin/challengeOptions",
    "POST /admin/challenges",
    "POST /admin/courses",
    "POST /admin/lessons",
    "POST /admin/units",
    "PUT /admin/challengeOptions/:id",
    "PUT /admin/challenges/:id",
    "PUT /admin/courses/:id",
    "PUT /admin/lessons/:id",
    "PUT /admin/units/:id",
  ]);
});

test("unpaged delivery preserves Content-Range without requesting a count", async () => {
  const { response, result } = createResponse();
  const query: ManagementQuery = {
    page: 1,
    limit: 100000,
    hasPage: false,
    filters: {},
    listQuery: {
      filters: { title: { contains: "eng" } },
      offset: 0,
      limit: 100000,
      sort: [{ field: "id", direction: "asc" }],
    },
  };
  const calls: unknown[] = [];

  await sendAdminListResponse(response, query, (listQuery, includeTotal) => {
    calls.push([listQuery, includeTotal]);
    return Promise.resolve({
      data: [{ id: 1, title: "English", imageSrc: "/en.svg" }],
    });
  });

  assert.deepEqual(calls, [
    [
      {
        filters: { title: { contains: "eng" } },
        offset: 0,
        limit: 100000,
        sort: [{ field: "id", direction: "asc" }],
      },
      false,
    ],
  ]);
  assert.equal(result.headers["Content-Range"], "items 0-0/1");
});

test("paged delivery preserves the response pagination contract", async () => {
  const { response, result } = createResponse();
  const query: ManagementQuery = {
    page: 2,
    limit: 2,
    hasPage: true,
    filters: {},
    listQuery: {
      filters: { title: { contains: "eng" } },
      offset: 2,
      limit: 2,
      sort: [{ field: "id", direction: "asc" }],
    },
  };

  await sendAdminListResponse(response, query, () =>
    Promise.resolve({
      data: [{ id: 3, title: "English", imageSrc: "/en.svg" }],
      total: 5,
    })
  );

  assert.deepEqual(result.body, {
    data: [{ id: 3, title: "English", imageSrc: "/en.svg" }],
    pagination: {
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    },
  });
});
