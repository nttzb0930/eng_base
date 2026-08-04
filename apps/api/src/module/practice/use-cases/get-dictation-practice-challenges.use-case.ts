import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapVocabularyItem } from "../../vocabulary";
import { SystemSettingsReader } from "../../settings";
import {
  PracticeSource,
  PracticeCefrLevel,
  DictationPracticeChallenge,
} from "./practice-source";

@Injectable()
export class GetDictationPracticeChallengesUseCase extends PracticeSource {
  constructor(prisma: PrismaService, settings: SystemSettingsReader) {
    super(prisma, settings);
  }

  private async getDictationVocabularyItems(
    userId: string,
    level?: PracticeCefrLevel,
    lessonNumber = 1
  ) {
    const wordsPerLesson = await this.getPracticeWordsPerLesson();
    return this.prisma.vocabulary_items.findMany({
      where: {
        ...(level ? { cefr_level: level } : {}),
        audio_url: {
          not: null,
        },
      },
      orderBy: {
        id: "asc",
      },
      include: {
        user_saved_words: {
          where: { user_id: userId },
        },
        user_vocabulary_progress: {
          where: { user_id: userId },
        },
        vocabulary_examples: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
      skip: (lessonNumber - 1) * wordsPerLesson,
      take: wordsPerLesson,
    });
  }

  async execute(userId: string, level?: string, lesson?: string) {
    const normalizedLevel = this.normalizePracticeCefrLevel(level);
    const lessonNumber = this.normalizePracticeLessonNumber(lesson);

    if (!userId) return [];

    const vocabularyItems = (
      await this.getDictationVocabularyItems(
        userId,
        normalizedLevel,
        lessonNumber
      )
    ).map(mapVocabularyItem);

    return vocabularyItems.map(
      (item, itemIndex): DictationPracticeChallenge => ({
        id: itemIndex + 1,
        type: "AUDIO_TO_TEXT",
        direction: "AUDIO_TO_EN",
        question: "Listen and type the English word.",
        vocabularyItem: item,
      })
    );
  }
}
