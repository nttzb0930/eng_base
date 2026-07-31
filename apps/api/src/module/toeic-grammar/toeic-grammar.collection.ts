import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { ToeicGrammarPracticeMode } from "@repo/shared";

export function grammarCollectionQuestionWhere(
  mode: ToeicGrammarPracticeMode,
  target: string
): Prisma.grammar_questionsWhereInput {
  if (!target.trim())
    throw new BadRequestException("Grammar target is required");
  switch (mode) {
    case "topic":
      return { grammar_topics: { source_topic_id: target } };
    case "subtopic":
      return { grammar_subtopics: { source_subtopic_id: target } };
    case "set":
      return {
        grammar_set_questions: {
          some: { grammar_sets: { source_set_id: target } },
        },
      };
    case "level": {
      const level = Number(target);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        throw new BadRequestException("Grammar level must be between 1 and 5");
      }
      return { grammar_question_difficulties: { is: { level } } };
    }
  }
}
