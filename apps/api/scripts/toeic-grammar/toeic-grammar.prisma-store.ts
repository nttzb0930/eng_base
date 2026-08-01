import { Prisma, type PrismaClient } from "@prisma/client";

import type { ToeicGrammarImportStore } from "./toeic-grammar.import.js";

export function createPrismaToeicGrammarImportStore(
  prisma: PrismaClient
): ToeicGrammarImportStore {
  return {
    async replace(snapshot) {
      const active = await prisma.grammar_content_snapshots.findFirst({
        where: {
          source: snapshot.source,
          inventory_sha256: snapshot.inventorySha256,
          active: true,
        },
        select: { id: true },
      });
      if (active) return "SKIPPED";

      await prisma.$transaction(async (transaction) => {
        await transaction.grammar_content_snapshots.deleteMany({
          where: { source: snapshot.source },
        });
        const createdSnapshot =
          await transaction.grammar_content_snapshots.create({
            data: {
              source: snapshot.source,
              snapshot_version: snapshot.snapshotVersion,
              inventory_sha256: snapshot.inventorySha256,
              content_sha256: snapshot.contentSha256,
              active: false,
            },
            select: { id: true },
          });
        const topicIds = new Map<string, number>();
        for (const topic of snapshot.topics) {
          const created = await transaction.grammar_topics.create({
            data: {
              snapshot_id: createdSnapshot.id,
              source: snapshot.source,
              source_topic_id: topic.sourceTopicId,
              title_en: topic.titleEn,
              title_vi: topic.titleVi,
              description_vi: topic.descriptionVi,
              icon: topic.icon,
              order_index: topic.orderIndex,
            },
            select: { id: true },
          });
          topicIds.set(topic.sourceTopicId, created.id);
        }
        const subtopicIds = new Map<string, number>();
        for (const subtopic of snapshot.subtopics) {
          const topicId = topicIds.get(subtopic.sourceTopicId);
          if (!topicId)
            throw new Error("Grammar subtopic topic was not imported");
          const created = await transaction.grammar_subtopics.create({
            data: {
              snapshot_id: createdSnapshot.id,
              topic_id: topicId,
              source: snapshot.source,
              source_subtopic_id: subtopic.sourceSubtopicId,
              title_en: subtopic.titleEn,
              title_vi: subtopic.titleVi,
              description_vi: subtopic.descriptionVi,
              access_level: subtopic.accessLevel,
              order_index: subtopic.orderIndex,
            },
            select: { id: true },
          });
          subtopicIds.set(subtopic.sourceSubtopicId, created.id);
        }
        for (const lesson of snapshot.lessons) {
          const subtopicId = subtopicIds.get(lesson.sourceSubtopicId);
          if (!subtopicId)
            throw new Error("Grammar lesson subtopic was not imported");
          await transaction.grammar_lessons.create({
            data: {
              snapshot_id: createdSnapshot.id,
              subtopic_id: subtopicId,
              source: snapshot.source,
              source_lesson_id: lesson.sourceLessonId,
              title_en: lesson.titleEn,
              title_vi: lesson.titleVi,
              content_type: lesson.contentType,
              theory_content_en: lesson.theoryContentEn,
              theory_content_vi: lesson.theoryContentVi,
              lesson_content_json:
                lesson.lessonContentJson === null
                  ? Prisma.DbNull
                  : (lesson.lessonContentJson as Prisma.InputJsonValue),
              html_content: lesson.htmlContent,
              order_index: lesson.orderIndex,
            },
          });
        }
        const questionIds = new Map<string, number>();
        for (const question of snapshot.questions) {
          const created = await transaction.grammar_questions.create({
            data: {
              snapshot_id: createdSnapshot.id,
              topic_id: question.sourceTopicId
                ? topicIds.get(question.sourceTopicId)
                : null,
              subtopic_id: question.sourceSubtopicId
                ? subtopicIds.get(question.sourceSubtopicId)
                : null,
              source: snapshot.source,
              source_question_id: question.sourceQuestionId,
              question_number: question.questionNumber,
              question_text: question.questionText,
              explanation_vi: question.explanationVi,
              explanation_en: question.explanationEn,
              question_translation: question.questionTranslation,
              answer_translation: question.answerTranslation,
              vocabulary: question.vocabulary as Prisma.InputJsonValue,
              prefer_ai_explanation: question.preferAiExplanation,
              grammar_question_options: {
                create: question.options.map((option) => ({
                  label: option.label,
                  text: option.text,
                  correct: option.correct,
                })),
              },
            },
            select: { id: true },
          });
          questionIds.set(question.sourceQuestionId, created.id);
        }
        for (const set of snapshot.sets) {
          const created = await transaction.grammar_sets.create({
            data: {
              snapshot_id: createdSnapshot.id,
              source: snapshot.source,
              source_set_id: set.sourceSetId,
              name: set.name,
              year: set.year,
              access_level: set.accessLevel,
            },
            select: { id: true },
          });
          if (set.questionIds.length > 0) {
            await transaction.grammar_set_questions.createMany({
              data: set.questionIds.map((sourceQuestionId, orderIndex) => ({
                set_id: created.id,
                question_id: questionIds.get(sourceQuestionId)!,
                order_index: orderIndex + 1,
              })),
            });
          }
        }
        const difficulties = snapshot.difficultyLevels.flatMap((difficulty) =>
          difficulty.questionIds.map((sourceQuestionId) => ({
            snapshot_id: createdSnapshot.id,
            question_id: questionIds.get(sourceQuestionId)!,
            level: difficulty.level,
          }))
        );
        if (difficulties.length > 0) {
          await transaction.grammar_question_difficulties.createMany({
            data: difficulties,
          });
        }
        await transaction.grammar_content_snapshots.update({
          where: { id: createdSnapshot.id },
          data: { active: true },
        });
      });
      return "UPDATED";
    },
  };
}
