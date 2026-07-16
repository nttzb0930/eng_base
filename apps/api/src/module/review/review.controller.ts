import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { ReviewService, SavedWordsReviewMode } from "./review.service";

@Controller("review")
@UseGuards(UserJwtGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get("daily/summary")
  getDailySummary(@CurrentUserId() userId: string) {
    return this.reviewService.getDailyReviewSummary(userId);
  }

  @Get("daily/challenges")
  getDailyChallenges(@CurrentUserId() userId: string) {
    return this.reviewService.getDailyReviewChallenges(userId);
  }

  @Get("saved/summary")
  getSavedSummary(@CurrentUserId() userId: string) {
    return this.reviewService.getSavedWordsReviewSummary(userId);
  }

  @Get("saved/challenges")
  getSavedChallenges(
    @CurrentUserId() userId: string,
    @Query("mode") mode?: SavedWordsReviewMode
  ) {
    return this.reviewService.getSavedWordReviewChallenges(userId, mode);
  }
}
