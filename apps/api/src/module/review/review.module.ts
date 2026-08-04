import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { VocabularyModule } from "../vocabulary";
import { SettingsModule } from "../settings";
import { ReviewController } from "./review.controller";
import { GetDailyReviewChallengesUseCase } from "./use-cases/get-daily-review-challenges.use-case";
import { GetDailyReviewSummaryUseCase } from "./use-cases/get-daily-review-summary.use-case";
import { GetSavedWordReviewChallengesUseCase } from "./use-cases/get-saved-word-review-challenges.use-case";
import { GetSavedWordReviewSummaryUseCase } from "./use-cases/get-saved-word-review-summary.use-case";

@Module({
  imports: [VocabularyModule, SettingsModule],
  controllers: [ReviewController],
  providers: [
    GetDailyReviewSummaryUseCase,
    GetDailyReviewChallengesUseCase,
    GetSavedWordReviewSummaryUseCase,
    GetSavedWordReviewChallengesUseCase,
    UserJwtGuard,
  ],
})
export class ReviewModule {}
