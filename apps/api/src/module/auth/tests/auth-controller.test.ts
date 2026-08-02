import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";

import { AdminAuthController } from "../admin-auth.controller";
import { AuthController } from "../auth.controller";
import { AUTH_RATE_LIMIT_POLICY } from "../../../common/decorators/auth-rate-limit.decorator";

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
    "POST /auth/forgot-password",
    "POST /auth/login",
    "POST /auth/logout",
    "POST /auth/refresh",
    "POST /auth/register",
    "POST /auth/resend-verification",
    "POST /auth/reset-password",
    "POST /auth/verify-email",
  ]);
  assert.deepEqual(routesOf(AdminAuthController), ["POST /admin/auth/login"]);
});

test("Auth delivery declares endpoint-specific rate-limit policies", () => {
  assert.equal(
    Reflect.getMetadata(AUTH_RATE_LIMIT_POLICY, AuthController.prototype.login),
    "login"
  );
  assert.equal(
    Reflect.getMetadata(
      AUTH_RATE_LIMIT_POLICY,
      AdminAuthController.prototype.login
    ),
    "login"
  );
  assert.equal(
    Reflect.getMetadata(
      AUTH_RATE_LIMIT_POLICY,
      AuthController.prototype.register
    ),
    "register"
  );
  assert.equal(
    Reflect.getMetadata(
      AUTH_RATE_LIMIT_POLICY,
      AuthController.prototype.refresh
    ),
    "refresh"
  );
});
