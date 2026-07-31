import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ToeicGrammarAnswerPayload,
  ToeicGrammarAnswerResult,
  ToeicGrammarProgressSummary,
  ToeicGrammarVocabularyEntry,
} from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { grammarCollectionQuestionWhere } from "../toeic-grammar.collection";
import {
  grammarProgressMap,
  summarizeGrammarProgress,
} from "../toeic-grammar.mapper";

export function grammarAnswerFingerprint(input: ToeicGrammarAnswerPayload) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        snapshotVersion: input.snapshotVersion,
        mode: input.mode,
        target: input.target,
        questionId: input.questionId,
        selectedOptionId: input.selectedOptionId,
      })
    )
    .digest("hex");
}

@Injectable()
export class SubmitToeicGrammarAnswerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    input: ToeicGrammarAnswerPayload
  ): Promise<ToeicGrammarAnswerResult> {
    const fingerprint = grammarAnswerFingerprint(input);
    const findExisting = () =>
      this.prisma.grammar_question_attempts.findUnique({
        where: {
          user_id_submission_key: {
            user_id: userId,
            submission_key: input.submissionKey,
          },
        },
      });
    const existing = await findExisting();
    if (existing) {
      if (existing.submission_fingerprint !== fingerprint) {
        throw new ConflictException("Grammar submission key was already used");
      }
      return mapStoredAttempt(existing);
    }

    const snapshot = await this.prisma.grammar_content_snapshots.findFirst({
      where: { active: true },
      orderBy: { imported_at: "desc" },
      select: { id: true, source: true, snapshot_version: true },
    });
    if (!snapshot) throw new NotFoundException("Grammar content not found");
    if (snapshot.snapshot_version !== input.snapshotVersion) {
      throw new ConflictException("Grammar content has changed");
    }
    const collectionWhere = grammarCollectionQuestionWhere(
      input.mode,
      input.target
    );
    const question = await this.prisma.grammar_questions.findFirst({
      where: {
        id: input.questionId,
        snapshot_id: snapshot.id,
        ...collectionWhere,
      },
      select: {
        id: true,
        source: true,
        source_question_id: true,
        question_number: true,
        question_text: true,
        explanation_vi: true,
        explanation_en: true,
        question_translation: true,
        answer_translation: true,
        vocabulary: true,
        grammar_question_options: {
          orderBy: { label: "asc" },
          select: { id: true, label: true, text: true, correct: true },
        },
      },
    });
    if (!question) throw new NotFoundException("Grammar question not found");
    const selectedOption = question.grammar_question_options.find(
      (option) => option.id === input.selectedOptionId
    );
    if (!selectedOption) {
      throw new BadRequestException(
        "Selected option does not belong to question"
      );
    }
    const correctOption = question.grammar_question_options.find(
      (option) => option.correct
    );
    if (!correctOption)
      throw new NotFoundException("Grammar answer key not found");
    const collectionQuestions = await this.prisma.grammar_questions.findMany({
      where: { snapshot_id: snapshot.id, ...collectionWhere },
      select: { source_question_id: true },
    });
    const now = new Date();
    const vocabulary = grammarVocabulary(question.vocabulary);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.grammar_question_progress.upsert({
          where: {
            user_id_source_source_question_id: {
              user_id: userId,
              source: question.source,
              source_question_id: question.source_question_id,
            },
          },
          create: {
            user_id: userId,
            source: question.source,
            source_question_id: question.source_question_id,
            attempts_count: 1,
            correct_count: selectedOption.correct ? 1 : 0,
            last_selected_option_label: selectedOption.label,
            last_correct: selectedOption.correct,
            first_answered_at: now,
          },
          update: {
            attempts_count: { increment: 1 },
            correct_count: selectedOption.correct
              ? { increment: 1 }
              : undefined,
            last_selected_option_label: selectedOption.label,
            last_correct: selectedOption.correct,
          },
        });
        const progressRows =
          await transaction.grammar_question_progress.findMany({
            where: {
              user_id: userId,
              source: question.source,
              source_question_id: {
                in: collectionQuestions.map((item) => item.source_question_id),
              },
            },
            select: { source_question_id: true, last_correct: true },
          });
        const collectionProgress = summarizeGrammarProgress(
          collectionQuestions.map((item) => item.source_question_id),
          grammarProgressMap(progressRows)
        );
        await transaction.grammar_question_attempts.create({
          data: {
            user_id: userId,
            source: question.source,
            source_question_id: question.source_question_id,
            submission_key: input.submissionKey,
            submission_fingerprint: fingerprint,
            snapshot_version: snapshot.snapshot_version,
            practice_mode: input.mode,
            practice_target: input.target,
            question_id_snapshot: question.id,
            question_number_snapshot: question.question_number,
            question_text_snapshot: question.question_text,
            selected_option_id_snapshot: selectedOption.id,
            selected_option_label_snapshot: selectedOption.label,
            selected_option_text_snapshot: selectedOption.text,
            correct_option_id_snapshot: correctOption.id,
            correct_option_label_snapshot: correctOption.label,
            correct_option_text_snapshot: correctOption.text,
            explanation_vi_snapshot: question.explanation_vi,
            explanation_en_snapshot: question.explanation_en,
            question_translation_snapshot: question.question_translation,
            answer_translation_snapshot: question.answer_translation,
            vocabulary_snapshot: vocabulary as Prisma.InputJsonValue,
            collection_progress_snapshot:
              collectionProgress as unknown as Prisma.InputJsonValue,
            correct: selectedOption.correct,
          },
        });
        return {
          questionId: question.id,
          selectedOptionId: selectedOption.id,
          correctOptionId: correctOption.id,
          correctOptionLabel: correctOption.label,
          correctOptionText: correctOption.text,
          correct: selectedOption.correct,
          explanationVi: question.explanation_vi,
          explanationEn: question.explanation_en,
          questionTranslation: question.question_translation,
          answerTranslation: question.answer_translation,
          vocabulary,
          questionProgress: {
            attempted: true,
            lastSelectedOptionId: selectedOption.id,
            lastCorrect: selectedOption.correct,
          },
          collectionProgress,
        };
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const winner = await findExisting();
      if (!winner) throw error;
      if (winner.submission_fingerprint !== fingerprint) {
        throw new ConflictException("Grammar submission key was already used");
      }
      return mapStoredAttempt(winner);
    }
  }
}

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function grammarVocabulary(
  value: Prisma.JsonValue
): ToeicGrammarVocabularyEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: ToeicGrammarVocabularyEntry[] = [];
  for (const entry of value) {
    if (typeof entry === "string") entries.push(entry);
    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      entries.push(entry as Record<string, unknown>);
    }
  }
  return entries;
}

function mapStoredAttempt(attempt: {
  question_id_snapshot: number;
  selected_option_id_snapshot: number;
  correct_option_id_snapshot: number;
  correct_option_label_snapshot: string;
  correct_option_text_snapshot: string;
  correct: boolean;
  explanation_vi_snapshot: string | null;
  explanation_en_snapshot: string | null;
  question_translation_snapshot: string | null;
  answer_translation_snapshot: string | null;
  vocabulary_snapshot: Prisma.JsonValue;
  collection_progress_snapshot: Prisma.JsonValue;
}): ToeicGrammarAnswerResult {
  return {
    questionId: attempt.question_id_snapshot,
    selectedOptionId: attempt.selected_option_id_snapshot,
    correctOptionId: attempt.correct_option_id_snapshot,
    correctOptionLabel: attempt.correct_option_label_snapshot,
    correctOptionText: attempt.correct_option_text_snapshot,
    correct: attempt.correct,
    explanationVi: attempt.explanation_vi_snapshot,
    explanationEn: attempt.explanation_en_snapshot,
    questionTranslation: attempt.question_translation_snapshot,
    answerTranslation: attempt.answer_translation_snapshot,
    vocabulary: grammarVocabulary(attempt.vocabulary_snapshot),
    questionProgress: {
      attempted: true,
      lastSelectedOptionId: attempt.selected_option_id_snapshot,
      lastCorrect: attempt.correct,
    },
    collectionProgress: storedProgress(attempt.collection_progress_snapshot),
  };
}

function storedProgress(value: Prisma.JsonValue): ToeicGrammarProgressSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConflictException("Stored Grammar submission is invalid");
  }
  const fields = value as Record<string, Prisma.JsonValue>;
  for (const key of [
    "questionCount",
    "correctCount",
    "incorrectCount",
    "unansweredCount",
  ]) {
    if (typeof fields[key] !== "number") {
      throw new ConflictException("Stored Grammar submission is invalid");
    }
  }
  return fields as unknown as ToeicGrammarProgressSummary;
}
