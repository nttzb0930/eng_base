import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class ToggleSavedWordUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: string, vocabularyItemId: number) {
    if (!userId) throw new UnauthorizedException("TOKEN_INVALID");
    const item = await this.prisma.vocabulary_items.findUnique({
      where: { id: vocabularyItemId }, select: { id: true },
    });
    if (!item) throw new NotFoundException("Vocabulary item not found.");
    const existing = await this.prisma.user_saved_words.findUnique({
      where: { user_id_vocabulary_item_id: {
        user_id: userId, vocabulary_item_id: vocabularyItemId,
      } },
    });
    if (existing) {
      await this.prisma.user_saved_words.delete({ where: { id: existing.id } });
      return { saved: false };
    }
    await this.prisma.user_saved_words.create({
      data: { user_id: userId, vocabulary_item_id: vocabularyItemId },
    });
    return { saved: true };
  }
}
