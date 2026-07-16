import { Injectable } from "@nestjs/common";

import { ReviewChallengeBuilder } from "./review-challenge.builder";

@Injectable()
export class GetDailyReviewChallengesUseCase {
  constructor(private readonly implementation: ReviewChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      ReviewChallengeBuilder["getDailyReviewChallenges"]
    >
  ) {
    return this.implementation.getDailyReviewChallenges(...arguments_);
  }
}
