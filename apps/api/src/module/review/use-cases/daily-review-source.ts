import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { GetSavedVocabularyWordsUseCase } from "../../vocabulary";
import { ReviewSource } from "./review-source";

@Injectable()
export class DailyReviewSource extends ReviewSource {
  constructor(
    prisma: PrismaService,
    savedWords: GetSavedVocabularyWordsUseCase
  ) {
    super(prisma, savedWords);
  }

  protected async getDailyReviewVocabularyItems(
    userId: string,
    selectedIds: number[]
  ) {
    if (selectedIds.length === 0) return [];

    const items = await this.prisma.vocabulary_items.findMany({
      where: {
        id: {
          in: selectedIds,
        },
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
    });

    return selectedIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  protected async getDailyReviewCandidateIds(userId: string) {
    const progress = await this.prisma.user_progress.findUnique({
      where: { user_id: userId },
      select: { intensity: true },
    });
    const intensity = progress?.intensity || "standard";
    const limit =
      intensity === "relaxed"
        ? 5
        : intensity === "standard"
          ? 15
          : intensity === "accelerated"
            ? 30
            : intensity === "intensive"
              ? 50
              : 15;

    const [dueRows, weakRows, savedRows, learnedRows] = await Promise.all([
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
          OR: [
            { next_review_at: null },
            { next_review_at: { lte: new Date() } },
          ],
        },
        orderBy: [{ next_review_at: "asc" }, { wrong_count: "desc" }],
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
          wrong_count: { gt: 0 },
        },
        orderBy: [{ wrong_count: "desc" }, { updated_at: "asc" }],
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_saved_words.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: { vocabulary_item_id: true },
        take: limit,
      }),
      this.prisma.user_vocabulary_progress.findMany({
        where: {
          user_id: userId,
          review_count: { gt: 0 },
        },
        orderBy: { updated_at: "desc" },
        select: { vocabulary_item_id: true },
        take: limit,
      }),
    ]);

    const selectedIds: number[] = [];

    this.pushUnique(
      selectedIds,
      dueRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      weakRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      savedRows.map((row) => row.vocabulary_item_id),
      limit
    );
    this.pushUnique(
      selectedIds,
      learnedRows.map((row) => row.vocabulary_item_id),
      limit
    );

    return {
      selectedIds,
      dueCount: dueRows.length,
      weakCount: weakRows.length,
      savedCount: savedRows.length,
    };
  }
}
