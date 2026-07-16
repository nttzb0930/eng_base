import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { VocabularyModule } from "../vocabulary";
import { ReviewController } from "./review.controller";
import { GetDailyReviewChallengesUseCase } from "./use-cases/get-daily-review-challenges.use-case";
import { GetDailyReviewSummaryUseCase } from "./use-cases/get-daily-review-summary.use-case";
import { GetSavedWordReviewChallengesUseCase } from "./use-cases/get-saved-word-review-challenges.use-case";
import { GetSavedWordReviewSummaryUseCase } from "./use-cases/get-saved-word-review-summary.use-case";
import { ReviewChallengeBuilder } from "./use-cases/review-challenge.builder";

@Module({
  imports: [VocabularyModule],
  controllers: [ReviewController],
  providers: [
    ReviewChallengeBuilder,
    GetDailyReviewSummaryUseCase,
    GetDailyReviewChallengesUseCase,
    GetSavedWordReviewSummaryUseCase,
    GetSavedWordReviewChallengesUseCase,
    UserJwtGuard,
  ],
})
export class ReviewModule {}
