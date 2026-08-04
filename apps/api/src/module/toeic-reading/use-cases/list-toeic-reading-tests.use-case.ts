import { Injectable } from "@nestjs/common";
import type { ToeicReadingPart, ToeicReadingTestSummary } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicReadingAttemptSummary,
  summarizeToeicReadingParts,
} from "../toeic-reading.mapper";
import { toeicReadingDraftScope } from "../toeic-reading-draft.mapper";

const naturalLabelCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

@Injectable()
export class ListToeicReadingTestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    part?: ToeicReadingPart
  ): Promise<ToeicReadingTestSummary[]> {
    const tests = await this.prisma.toeic_tests.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ published_at: "desc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        source_version: true,
        toeic_test_sets: { select: { title: true } },
        toeic_questions: {
          where: part ? { part } : undefined,
          orderBy: { number: "asc" },
          select: { part: true },
        },
        toeic_reading_attempts: {
          where: { user_id: userId, practice_part: part ?? null },
          orderBy: [{ submitted_at: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            test_id: true,
            practice_part: true,
            test_title_snapshot: true,
            correct_count: true,
            total_count: true,
            accuracy: true,
            submitted_at: true,
          },
        },
        toeic_reading_drafts: {
          where: {
            user_id: userId,
            scope: toeicReadingDraftScope(part),
          },
          orderBy: { updated_at: "desc" },
          take: 1,
          select: {
            source_version: true,
            active_question_id: true,
            answers: true,
            updated_at: true,
            expires_at: true,
          },
        },
      },
    });

    const summaries = tests.map((test) => {
      const questions = test.toeic_questions.filter(
        (question) => part === undefined || question.part === part
      );
      const draft = test.toeic_reading_drafts[0];
      const validDraft =
        draft &&
        draft.source_version === test.source_version &&
        draft.expires_at.getTime() > Date.now()
          ? draft
          : null;
      return {
        id: test.id,
        title: test.title,
        sourceSetName: test.toeic_test_sets.title,
        sourceVersion: test.source_version,
        questionCount: questions.length,
        parts: summarizeToeicReadingParts(questions),
        draftProgress: validDraft
          ? {
              answeredCount: Array.isArray(validDraft.answers)
                ? validDraft.answers.length
                : 0,
              totalCount: questions.length,
              activeQuestionId: validDraft.active_question_id,
              updatedAt: validDraft.updated_at.toISOString(),
            }
          : null,
        latestAttempt: test.toeic_reading_attempts[0]
          ? mapToeicReadingAttemptSummary(test.toeic_reading_attempts[0])
          : null,
      };
    });

    return summaries.sort((left, right) => {
      const sourceSetOrder = naturalLabelCollator.compare(
        right.sourceSetName,
        left.sourceSetName
      );
      return (
        sourceSetOrder || naturalLabelCollator.compare(left.title, right.title)
      );
    });
  }
}
