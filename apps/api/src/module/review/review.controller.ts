import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { ReviewService, SavedWordsReviewMode } from "./review.service";

@Controller("review")
@UseGuards(UserJwtGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get("daily/summary")
  getDailySummary() {
    return this.reviewService.getDailyReviewSummary();
  }

  @Get("daily/challenges")
  getDailyChallenges() {
    return this.reviewService.getDailyReviewChallenges();
  }

  @Get("saved/summary")
  getSavedSummary() {
    return this.reviewService.getSavedWordsReviewSummary();
  }

  @Get("saved/challenges")
  getSavedChallenges(@Query("mode") mode?: SavedWordsReviewMode) {
    return this.reviewService.getSavedWordReviewChallenges(mode);
  }
}
