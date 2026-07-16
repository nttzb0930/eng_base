import { Injectable } from "@nestjs/common";

import { ReviewChallengeBuilder } from "./review-challenge.builder";

@Injectable()
export class GetDailyReviewSummaryUseCase {
  constructor(private readonly implementation: ReviewChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<ReviewChallengeBuilder["getDailyReviewSummary"]>
  ) {
    return this.implementation.getDailyReviewSummary(...arguments_);
  }
}
