import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ToeicGrammarPractice,
  ToeicGrammarPracticeMode,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { grammarCollectionQuestionWhere } from "../toeic-grammar.collection";
import {
  grammarProgressMap,
  mapGrammarQuestionProgress,
  summarizeGrammarProgress,
} from "../toeic-grammar.mapper";

@Injectable()
export class GetToeicGrammarPracticeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    mode: ToeicGrammarPracticeMode,
    target: string
  ): Promise<ToeicGrammarPractice> {
    const snapshot = await this.prisma.grammar_content_snapshots.findFirst({
      where: { active: true },
      orderBy: { imported_at: "desc" },
      select: {
        id: true,
        source: true,
        snapshot_version: true,
        grammar_topics: {
          where: { source_topic_id: target },
          select: { source_topic_id: true, title_en: true, title_vi: true },
        },
        grammar_subtopics: {
          where: { source_subtopic_id: target },
          select: {
            source_subtopic_id: true,
            title_en: true,
            title_vi: true,
          },
        },
        grammar_sets: {
          where: { source_set_id: target },
          select: { source_set_id: true, name: true },
        },
      },
    });
    if (!snapshot) throw new NotFoundException("Grammar content not found");
    const metadata = collectionMetadata(snapshot, mode, target);
    if (!metadata) throw new NotFoundException("Grammar collection not found");

    const questions = await this.prisma.grammar_questions.findMany({
      where: {
        snapshot_id: snapshot.id,
        ...grammarCollectionQuestionWhere(mode, target),
      },
      orderBy: [{ question_number: "asc" }, { id: "asc" }],
      select: {
        id: true,
        source_question_id: true,
        question_number: true,
        question_text: true,
        grammar_question_options: {
          orderBy: { label: "asc" },
          select: { id: true, label: true, text: true },
        },
      },
    });
    const progressRows =
      await this.prisma.grammar_question_progress.findMany({
        where: {
          user_id: userId,
          source: snapshot.source,
          source_question_id: {
            in: questions.map((question) => question.source_question_id),
          },
        },
        select: {
          source_question_id: true,
          last_selected_option_label: true,
          last_correct: true,
        },
      });
    const progress = grammarProgressMap(progressRows);
    const learnerQuestions = questions.map((question) => ({
      id: question.id,
      number: question.question_number,
      prompt: question.question_text,
      options: question.grammar_question_options.map((option) => ({
        id: option.id,
        label: option.label,
        text: option.text,
      })),
      progress: mapGrammarQuestionProgress(
        progress.get(question.source_question_id),
        question.grammar_question_options
      ),
    }));
    const initialQuestionIndex = Math.max(
      0,
      learnerQuestions.findIndex((question) => !question.progress.attempted)
    );
    return {
      snapshotVersion: snapshot.snapshot_version,
      mode,
      target,
      ...metadata,
      progress: summarizeGrammarProgress(
        questions.map((question) => question.source_question_id),
        progress
      ),
      initialQuestionIndex,
      questions: learnerQuestions,
    };
  }
}

function collectionMetadata(
  snapshot: {
    grammar_topics: Array<{
      source_topic_id: string;
      title_en: string | null;
      title_vi: string;
    }>;
    grammar_subtopics: Array<{
      source_subtopic_id: string;
      title_en: string | null;
      title_vi: string;
    }>;
    grammar_sets: Array<{
      source_set_id: string;
      name: string;
    }>;
  },
  mode: ToeicGrammarPracticeMode,
  target: string
) {
  if (mode === "topic") {
    const row = snapshot.grammar_topics[0];
    return row ? { titleEn: row.title_en, titleVi: row.title_vi } : null;
  }
  if (mode === "subtopic") {
    const row = snapshot.grammar_subtopics[0];
    return row ? { titleEn: row.title_en, titleVi: row.title_vi } : null;
  }
  if (mode === "set") {
    const row = snapshot.grammar_sets[0];
    return row ? { titleEn: row.name, titleVi: row.name } : null;
  }
  const level = Number(target);
  return Number.isInteger(level) && level >= 1 && level <= 5
    ? { titleEn: `Level ${level}`, titleVi: `Cấp độ ${level}` }
    : null;
}
