import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { validate } from "class-validator";

import { FlashcardSessionQueryDto } from "../dto/flashcard-session-query.dto";
import { FlashcardsController } from "../flashcards.controller";

test("Flashcards controller delegates the complete session query", async () => {
  const calls: unknown[][] = [];
  const controller = new FlashcardsController({} as never, {
    execute: async (...args: unknown[]) => {
      calls.push(args);
      return [];
    },
  } as never);
  const query = Object.assign(new FlashcardSessionQueryDto(), {
    source: "topic" as const,
    slug: "travel",
  });

  assert.deepEqual(
    await controller.getFlashcardSession("user-1", query),
    [],
  );
  assert.deepEqual(calls, [["user-1", query]]);
  assert.equal(
    Reflect.getMetadata(
      PATH_METADATA,
      FlashcardsController.prototype.getFlashcardSession,
    ),
    "session",
  );
  assert.equal(
    Reflect.getMetadata(
      METHOD_METADATA,
      FlashcardsController.prototype.getFlashcardSession,
    ),
    RequestMethod.GET,
  );
});

test("Flashcard session DTO rejects unsupported sources", async () => {
  const valid = Object.assign(new FlashcardSessionQueryDto(), {
    source: "topic",
    slug: "travel",
  });
  const invalid = Object.assign(new FlashcardSessionQueryDto(), {
    source: "certificate",
  });

  assert.deepEqual(await validate(valid), []);
  assert.equal(
    (await validate(invalid)).some((error) => error.property === "source"),
    true,
  );
});
