import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapSavedWord, mapVocabularyItem } from "../mappers/vocabulary-item.mapper";

@Injectable()
export class GetSavedVocabularyWordsUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: string) {
    if (!userId) return [];
    const data = await this.prisma.user_saved_words.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      include: { vocabulary_items: { include: {
        user_vocabulary_progress: { where: { user_id: userId } },
        vocabulary_examples: { orderBy: { order: "asc" } },
      } } },
    });
    return data.map((savedWord) => ({
      ...mapSavedWord(savedWord),
      vocabularyItem: mapVocabularyItem(savedWord.vocabulary_items),
    }));
  }
}
