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
import { AdminCourseContentController } from "../admin-course-content.controller";
import type { CourseContentManagementUseCases } from "../use-cases/course-content-management.use-cases";

type ManagementQuery = FilterParseResult<Record<string, unknown>>;

const createResponse = () => {
  const result: {
    headers: Record<string, string>;
    body?: unknown;
  } = { headers: {} };

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

test("controller owns the exact 25 existing admin course-management routes", () => {
  const controllerPath = Reflect.getMetadata(
    PATH_METADATA,
    AdminCourseContentController
  ) as string;
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    AdminCourseContentController
  ) as unknown[];
  const prototype = AdminCourseContentController.prototype;

  const routes = Object.getOwnPropertyNames(prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(prototype, property)
        ?.value as unknown;
      if (typeof handler !== "function") return [];

      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      if (path === undefined || method === undefined) return [];

      return [`${RequestMethod[method]} /${controllerPath}/${path}`];
    })
    .sort();

  assert.ok(guards.includes(AdminJwtGuard));
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

test("non-paged lists preserve Content-Range and omit pagination arguments", async () => {
  const calls: unknown[] = [];
  const service = {
    listCourses(query: unknown) {
      calls.push(query);
      return Promise.resolve([
        { id: 1, title: "English", imageSrc: "/en.svg" },
      ]);
    },
    countCourses() {
      throw new Error("count must not run for an unpaged list");
    },
  } as unknown as CourseContentManagementUseCases;
  const controller = new AdminCourseContentController(service);
  const { response, result } = createResponse();
  const query: ManagementQuery = {
    page: 1,
    limit: 100000,
    hasPage: false,
    filters: {},
    prismaQuery: {
      where: { title: { contains: "eng" } },
      skip: 0,
      take: 100000,
      orderBy: [{ id: "asc" }],
    },
  };

  await controller.listCourses(response, query);

  assert.deepEqual(calls, [
    {
      where: { title: { contains: "eng" } },
      orderBy: [{ id: "asc" }],
    },
  ]);
  assert.equal(result.headers["Content-Range"], "items 0-0/1");
  assert.deepEqual(result.body, [
    { id: 1, title: "English", imageSrc: "/en.svg" },
  ]);
});

test("empty non-paged lists preserve the compatibility Content-Range", async () => {
  const service = {
    listCourses() {
      return Promise.resolve([]);
    },
    countCourses() {
      throw new Error("count must not run for an unpaged list");
    },
  } as unknown as CourseContentManagementUseCases;
  const controller = new AdminCourseContentController(service);
  const { response, result } = createResponse();
  const query: ManagementQuery = {
    page: 1,
    limit: 100000,
    hasPage: false,
    filters: {},
    prismaQuery: {
      where: {},
      skip: 0,
      take: 100000,
      orderBy: [{ id: "asc" }],
    },
  };

  await controller.listCourses(response, query);

  assert.equal(result.headers["Content-Range"], "items 0-0/0");
  assert.deepEqual(result.body, []);
});

test("paged lists preserve the response pagination shape", async () => {
  const calls: unknown[] = [];
  const service = {
    listCourses(query: unknown) {
      calls.push(["list", query]);
      return Promise.resolve([
        { id: 3, title: "English", imageSrc: "/en.svg" },
      ]);
    },
    countCourses(where: unknown) {
      calls.push(["count", where]);
      return Promise.resolve(5);
    },
  } as unknown as CourseContentManagementUseCases;
  const controller = new AdminCourseContentController(service);
  const { response, result } = createResponse();
  const query: ManagementQuery = {
    page: 2,
    limit: 2,
    hasPage: true,
    filters: {},
    prismaQuery: {
      where: { title: { contains: "eng" } },
      skip: 2,
      take: 2,
      orderBy: [{ id: "asc" }],
    },
  };

  await controller.listCourses(response, query);

  assert.deepEqual(calls, [
    ["list", query.prismaQuery],
    ["count", query.prismaQuery.where],
  ]);
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
