import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";

import { AdminAuthController } from "../admin-auth.controller";
import { AuthController } from "../auth.controller";

function routesOf(controller: new (...arguments_: never[]) => unknown) {
  const root = Reflect.getMetadata(PATH_METADATA, controller) as string;
  return Object.getOwnPropertyNames(controller.prototype)
    .flatMap((property) => {
      const handler = Object.getOwnPropertyDescriptor(
        controller.prototype,
        property
      )?.value as unknown;
      if (typeof handler !== "function") return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      return path === undefined || method === undefined
        ? []
        : [`${RequestMethod[method]} /${root}/${path}`];
    })
    .sort();
}

test("Auth delivery preserves learner and admin route Interfaces", () => {
  assert.deepEqual(routesOf(AuthController), [
    "POST /auth/login",
    "POST /auth/logout",
    "POST /auth/refresh",
    "POST /auth/register",
  ]);
  assert.deepEqual(routesOf(AdminAuthController), ["POST /admin/auth/login"]);
});
