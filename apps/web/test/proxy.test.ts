import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "../proxy";

test("an unprefixed learner route redirects to the default locale", () => {
  const response = proxy(new NextRequest("http://localhost:3000/dashboard"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3000/vi/dashboard"
  );
});

test("an unauthenticated localized route keeps its locale when redirecting", () => {
  const response = proxy(new NextRequest("http://localhost:3000/en/dashboard"));

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3000/en/sign-in"
  );
});

test("email verification remains public after registration", () => {
  const response = proxy(
    new NextRequest(
      "http://localhost:3000/vi/verify-email?email=learner%40example.com"
    )
  );

  assert.equal(response.status, 200);
});
