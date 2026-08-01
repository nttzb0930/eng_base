import { Injectable } from "@nestjs/common";
import type {
  ToeicGrammarCatalog,
  ToeicGrammarLevelSummary,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  grammarProgressMap,
  summarizeGrammarProgress,
} from "../toeic-grammar.mapper";

function resolveGrammarSetYear(year: number | null, name: string) {
  if (year !== null) return year;
  const match = name.match(/\b(?:19|20)\d{2}\b/u);
  return match ? Number(match[0]) : null;
}

@Injectable()
export class GetToeicGrammarCatalogUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<ToeicGrammarCatalog> {
    const snapshot = await this.prisma.grammar_content_snapshots.findFirst({
      where: { active: true },
      orderBy: { imported_at: "desc" },
      select: {
        source: true,
        snapshot_version: true,
        grammar_topics: {
          orderBy: [{ order_index: "asc" }, { id: "asc" }],
          select: {
            source_topic_id: true,
            title_en: true,
            title_vi: true,
            description_vi: true,
            icon: true,
            order_index: true,
            grammar_questions: { select: { source_question_id: true } },
            grammar_subtopics: {
              orderBy: [{ order_index: "asc" }, { id: "asc" }],
              select: {
                source_subtopic_id: true,
                title_en: true,
                title_vi: true,
                description_vi: true,
                access_level: true,
                order_index: true,
                grammar_questions: { select: { source_question_id: true } },
              },
            },
          },
        },
        grammar_sets: {
          orderBy: { id: "asc" },
          select: {
            source_set_id: true,
            name: true,
            year: true,
            access_level: true,
            grammar_set_questions: {
              orderBy: { order_index: "asc" },
              select: {
                grammar_questions: { select: { source_question_id: true } },
              },
            },
          },
        },
        grammar_question_difficulties: {
          orderBy: [{ level: "asc" }, { question_id: "asc" }],
          select: {
            level: true,
            grammar_questions: { select: { source_question_id: true } },
          },
        },
      },
    });
    if (!snapshot) {
      return {
        available: false,
        snapshotVersion: null,
        topics: [],
        sets: [],
        levels: [],
      };
    }

    const progressRows = await this.prisma.grammar_question_progress.findMany({
      where: { user_id: userId, source: snapshot.source },
      select: { source_question_id: true, last_correct: true },
    });
    const progress = grammarProgressMap(progressRows);
    const topics = snapshot.grammar_topics.map((topic) => {
      const topicIds = topic.grammar_questions.map(
        (question) => question.source_question_id
      );
      return {
        target: topic.source_topic_id,
        titleEn: topic.title_en,
        titleVi: topic.title_vi,
        descriptionVi: topic.description_vi,
        icon: topic.icon,
        ...summarizeGrammarProgress(topicIds, progress),
        subtopics: topic.grammar_subtopics.map((subtopic) => ({
          target: subtopic.source_subtopic_id,
          titleEn: subtopic.title_en,
          titleVi: subtopic.title_vi,
          descriptionVi: subtopic.description_vi,
          accessLevel: subtopic.access_level,
          ...summarizeGrammarProgress(
            subtopic.grammar_questions.map(
              (question) => question.source_question_id
            ),
            progress
          ),
        })),
      };
    });
    const sets = snapshot.grammar_sets
      .map((set) => ({
        target: set.source_set_id,
        titleEn: set.name,
        titleVi: set.name,
        descriptionVi: null,
        year: resolveGrammarSetYear(set.year, set.name),
        accessLevel: set.access_level,
        ...summarizeGrammarProgress(
          set.grammar_set_questions.map(
            (membership) => membership.grammar_questions.source_question_id
          ),
          progress
        ),
      }))
      .sort((left, right) => {
        if (left.year === null && right.year === null) {
          return left.titleVi.localeCompare(right.titleVi);
        }
        if (left.year === null) return 1;
        if (right.year === null) return -1;
        return (
          right.year - left.year || left.titleVi.localeCompare(right.titleVi)
        );
      });
    const byLevel = new Map<number, string[]>();
    for (const membership of snapshot.grammar_question_difficulties) {
      const ids = byLevel.get(membership.level) ?? [];
      ids.push(membership.grammar_questions.source_question_id);
      byLevel.set(membership.level, ids);
    }
    const levels = ([1, 2, 3, 4, 5] as const).map(
      (level): ToeicGrammarLevelSummary => ({
        target: String(level),
        level,
        ...summarizeGrammarProgress(byLevel.get(level) ?? [], progress),
      })
    );
    return {
      available: true,
      snapshotVersion: snapshot.snapshot_version,
      topics,
      sets,
      levels,
    };
  }
}
