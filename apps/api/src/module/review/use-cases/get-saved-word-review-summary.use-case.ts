import { Injectable } from "@nestjs/common";

import { ReviewChallengeBuilder } from "./review-challenge.builder";

@Injectable()
export class GetSavedWordReviewSummaryUseCase {
  constructor(private readonly implementation: ReviewChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      ReviewChallengeBuilder["getSavedWordsReviewSummary"]
    >
  ) {
    return this.implementation.getSavedWordsReviewSummary(...arguments_);
  }
}
