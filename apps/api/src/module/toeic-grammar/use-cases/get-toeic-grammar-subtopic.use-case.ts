import { Injectable, NotFoundException } from "@nestjs/common";
import type { ToeicGrammarSubtopicDetail } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  grammarProgressMap,
  summarizeGrammarProgress,
} from "../toeic-grammar.mapper";

@Injectable()
export class GetToeicGrammarSubtopicUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    target: string
  ): Promise<ToeicGrammarSubtopicDetail> {
    const snapshot = await this.prisma.grammar_content_snapshots.findFirst({
      where: { active: true },
      orderBy: { imported_at: "desc" },
      select: {
        source: true,
        snapshot_version: true,
        grammar_subtopics: {
          where: { source_subtopic_id: target },
          take: 1,
          select: {
            source_subtopic_id: true,
            title_en: true,
            title_vi: true,
            description_vi: true,
            grammar_topics: {
              select: {
                source_topic_id: true,
                title_en: true,
                title_vi: true,
              },
            },
            grammar_lessons: {
              orderBy: [{ order_index: "asc" }, { id: "asc" }],
              select: {
                source_lesson_id: true,
                title_en: true,
                title_vi: true,
                content_type: true,
                theory_content_en: true,
                theory_content_vi: true,
                lesson_content_json: true,
              },
            },
            grammar_questions: { select: { source_question_id: true } },
          },
        },
      },
    });
    const subtopic = snapshot?.grammar_subtopics[0];
    if (!snapshot || !subtopic) {
      throw new NotFoundException("TOEIC Grammar subtopic not found");
    }

    const questionIds = subtopic.grammar_questions.map(
      (question) => question.source_question_id
    );
    const progressRows = await this.prisma.grammar_question_progress.findMany({
      where: {
        user_id: userId,
        source: snapshot.source,
        source_question_id: { in: questionIds },
      },
      select: { source_question_id: true, last_correct: true },
    });

    return {
      snapshotVersion: snapshot.snapshot_version,
      topicTarget: subtopic.grammar_topics.source_topic_id,
      topicTitleEn: subtopic.grammar_topics.title_en,
      topicTitleVi: subtopic.grammar_topics.title_vi,
      target: subtopic.source_subtopic_id,
      titleEn: subtopic.title_en,
      titleVi: subtopic.title_vi,
      descriptionVi: subtopic.description_vi,
      lessons: subtopic.grammar_lessons.map((lesson) => ({
        target: lesson.source_lesson_id,
        titleEn: lesson.title_en,
        titleVi: lesson.title_vi,
        contentType: lesson.content_type,
        theoryContentEn: lesson.theory_content_en,
        theoryContentVi: lesson.theory_content_vi,
        structuredContent: lesson.lesson_content_json,
      })),
      progress: summarizeGrammarProgress(
        questionIds,
        grammarProgressMap(progressRows)
      ),
    };
  }
}
