import { Injectable } from "@nestjs/common";
import type {
  ToeicListeningPart,
  ToeicListeningTestSummary,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  mapToeicListeningAttemptSummary,
  summarizeToeicListeningParts,
  TOEIC_LISTENING_PARTS,
} from "../toeic-listening.mapper";
import { toeicListeningDraftScope } from "../toeic-listening-draft.mapper";

const naturalLabelCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

@Injectable()
export class ListToeicListeningTestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    part?: ToeicListeningPart
  ): Promise<ToeicListeningTestSummary[]> {
    const tests = await this.prisma.toeic_tests.findMany({
      where: {
        listening_status: "PUBLISHED",
        listening_source_version: { not: null },
      },
      orderBy: [{ listening_published_at: "desc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        listening_source_version: true,
        toeic_test_sets: { select: { title: true } },
        toeic_questions: {
          where: part ? { part } : { part: { in: [...TOEIC_LISTENING_PARTS] } },
          select: { part: true },
        },
        toeic_listening_attempts: {
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
        toeic_listening_drafts: {
          where: {
            user_id: userId,
            scope: toeicListeningDraftScope(part),
            expires_at: { gt: new Date() },
          },
          take: 1,
          select: {
            listening_source_version: true,
            answers: true,
            active_question_id: true,
            updated_at: true,
          },
        },
      },
    });

    return tests
      .map((test) => {
        const draft = test.toeic_listening_drafts[0];
        const validDraft =
          draft?.listening_source_version === test.listening_source_version
            ? draft
            : null;
        return {
          id: test.id,
          title: test.title,
          sourceSetName: test.toeic_test_sets.title,
          listeningSourceVersion: test.listening_source_version!,
          questionCount: test.toeic_questions.length,
          parts: summarizeToeicListeningParts(test.toeic_questions).filter(
            (summary) => part === undefined || summary.part === part
          ),
          draftProgress: validDraft
            ? {
                answeredCount: Array.isArray(validDraft.answers)
                  ? validDraft.answers.length
                  : 0,
                totalCount: test.toeic_questions.length,
                activeQuestionId: validDraft.active_question_id,
                updatedAt: validDraft.updated_at.toISOString(),
              }
            : null,
          latestAttempt: test.toeic_listening_attempts[0]
            ? mapToeicListeningAttemptSummary(test.toeic_listening_attempts[0])
            : null,
        };
      })
      .sort((left, right) => {
        const sourceSetOrder = naturalLabelCollator.compare(
          right.sourceSetName,
          left.sourceSetName
        );
        return (
          sourceSetOrder ||
          naturalLabelCollator.compare(left.title, right.title)
        );
      });
  }
}
