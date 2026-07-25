import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "class-validator";

import { TopicPracticeQueryDto } from "../dto/topic-practice-query.dto";

test("Topic Practice accepts every supported mode", async () => {
  for (const mode of ["weak", "new", "all"]) {
    const dto = Object.assign(new TopicPracticeQueryDto(), { mode });

    assert.equal((await validate(dto)).length, 0);
  }
});

test("Topic Practice rejects unsupported modes", async () => {
  const dto = Object.assign(new TopicPracticeQueryDto(), { mode: "random" });
  const errors = await validate(dto);

  assert.equal(errors[0]?.property, "mode");
});

test("Topic Practice defaults to all mode", async () => {
  const dto = new TopicPracticeQueryDto();

  assert.equal(dto.mode, "all");
  assert.equal((await validate(dto)).length, 0);
});
