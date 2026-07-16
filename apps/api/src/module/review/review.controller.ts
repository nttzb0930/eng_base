import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { GetDailyReviewChallengesUseCase } from "./use-cases/get-daily-review-challenges.use-case";
import { GetDailyReviewSummaryUseCase } from "./use-cases/get-daily-review-summary.use-case";
import { GetSavedWordReviewChallengesUseCase } from "./use-cases/get-saved-word-review-challenges.use-case";
import { GetSavedWordReviewSummaryUseCase } from "./use-cases/get-saved-word-review-summary.use-case";
import type { SavedWordsReviewMode } from "./use-cases/review-source";

@Controller("review")
@UseGuards(UserJwtGuard)
export class ReviewController {
  constructor(
    private readonly dailySummary: GetDailyReviewSummaryUseCase,
    private readonly dailyChallenges: GetDailyReviewChallengesUseCase,
    private readonly savedSummary: GetSavedWordReviewSummaryUseCase,
    private readonly savedChallenges: GetSavedWordReviewChallengesUseCase
  ) {}

  @Get("daily/summary")
  getDailySummary(@CurrentUserId() userId: string) {
    return this.dailySummary.execute(userId);
  }

  @Get("daily/challenges")
  getDailyChallenges(@CurrentUserId() userId: string) {
    return this.dailyChallenges.execute(userId);
  }

  @Get("saved/summary")
  getSavedSummary(@CurrentUserId() userId: string) {
    return this.savedSummary.execute(userId);
  }

  @Get("saved/challenges")
  getSavedChallenges(
    @CurrentUserId() userId: string,
    @Query("mode") mode?: SavedWordsReviewMode
  ) {
    return this.savedChallenges.execute(userId, mode);
  }
}
