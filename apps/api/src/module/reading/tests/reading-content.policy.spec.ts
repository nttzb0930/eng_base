import assert from "node:assert/strict";
import test from "node:test";
import type { CreateReadingPassagePayload } from "@repo/shared";

import { validateReadingContent } from "../use-cases/reading-content.policy";

const validPassage: CreateReadingPassagePayload = {
  slug: "a-day-in-hanoi",
  title: "A Day in Hanoi",
  body: "Mia lives in Hanoi.",
  cefrLevel: "A1",
  topicId: null,
  estimatedMinutes: 3,
  questions: [
    {
      prompt: "Where does Mia live?",
      order: 1,
      options: [
        { text: "In Hanoi", order: 1, correct: true },
        { text: "In London", order: 2, correct: false },
      ],
    },
  ],
};

test("accepts a complete A1 Reading aggregate", () => {
  assert.deepEqual(validateReadingContent(validPassage), []);
});

test("rejects levels that are not enabled for Reading", () => {
  assert.deepEqual(
    validateReadingContent({
      ...validPassage,
      cefrLevel: "A2" as "A1",
    }),
    ["Reading currently supports A1 only"],
  );
});

test("requires at least one comprehension question", () => {
  assert.ok(
    validateReadingContent({ ...validPassage, questions: [] }).includes(
      "At least one question is required",
    ),
  );
});

test("requires two options and exactly one correct option", () => {
  const [question] = validPassage.questions;
  assert.ok(question);

  assert.ok(
    validateReadingContent({
      ...validPassage,
      questions: [{ ...question, options: [question.options[0]!] }],
    }).includes("Each question requires at least two options"),
  );
  assert.ok(
    validateReadingContent({
      ...validPassage,
      questions: [
        {
          ...question,
          options: question.options.map((option) => ({
            ...option,
            correct: true,
          })),
        },
      ],
    }).includes("Each question requires exactly one correct option"),
  );
});

test("requires unique question and option order", () => {
  const [question] = validPassage.questions;
  assert.ok(question);

  assert.ok(
    validateReadingContent({
      ...validPassage,
      questions: [question, { ...question, prompt: "Second question" }],
    }).includes("Question order must be unique"),
  );
  assert.ok(
    validateReadingContent({
      ...validPassage,
      questions: [
        {
          ...question,
          options: question.options.map((option) => ({
            ...option,
            order: 1,
          })),
        },
      ],
    }).includes("Option order must be unique within each question"),
  );
});

test("rejects blank content and invalid positive integers", () => {
  const [question] = validPassage.questions;
  assert.ok(question);

  const issues = validateReadingContent({
    ...validPassage,
    slug: " ",
    title: "",
    body: " ",
    estimatedMinutes: 0,
    questions: [
      {
        ...question,
        prompt: " ",
        order: 0,
        options: [
          { text: " ", order: 0, correct: true },
          question.options[1]!,
        ],
      },
    ],
  });

  for (const issue of [
    "Passage slug is required",
    "Passage title is required",
    "Passage body is required",
    "Estimated minutes must be a positive integer",
    "Question prompt is required",
    "Question order must be a positive integer",
    "Option text is required",
    "Option order must be a positive integer",
  ]) {
    assert.ok(issues.includes(issue), issue);
  }
});
