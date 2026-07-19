import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "class-validator";

import * as topicsModule from "./index";
import { TopicsController } from "./topics.controller";

test("topics controller forwards locale and level to its use cases", async () => {
  const calls: unknown[] = [];
  const controller = new TopicsController(
    {
      execute: async (...args: unknown[]) => {
        calls.push(["list", ...args]);
        return [];
      },
    } as never,
    {
      execute: async (...args: unknown[]) => {
        calls.push(["detail", ...args]);
        return null;
      },
    } as never,
  );

  const getTopics = controller.getTopics.bind(controller) as (
    userId: string,
    query: { locale: "vi" },
  ) => Promise<unknown>;
  const getTopicBySlug = controller.getTopicBySlug.bind(controller) as (
    userId: string,
    slug: string,
    query: { locale: "vi"; level: "A1" },
  ) => Promise<unknown>;

  await getTopics("user-1", { locale: "vi" });
  await getTopicBySlug("user-1", "airport", { locale: "vi", level: "A1" });

  assert.deepEqual(calls, [
    ["list", "user-1", "vi"],
    ["detail", "user-1", "airport", "A1", "vi"],
  ]);
});

test("topic query DTO defaults to English and rejects unsupported locales", async () => {
  const TopicsQueryDto = (
    topicsModule as typeof topicsModule & {
      TopicsQueryDto?: new () => { locale: string };
    }
  ).TopicsQueryDto;

  assert.equal(typeof TopicsQueryDto, "function");
  if (!TopicsQueryDto) return;

  const defaults = new TopicsQueryDto();
  assert.equal(defaults.locale, "en");
  assert.deepEqual(await validate(defaults), []);

  const invalid = Object.assign(new TopicsQueryDto(), { locale: "fr" });
  const errors = await validate(invalid);
  assert.equal(errors.some((error) => error.property === "locale"), true);
});
