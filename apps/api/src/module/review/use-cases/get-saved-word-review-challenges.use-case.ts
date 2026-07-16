import { Injectable } from "@nestjs/common";

import { ReviewChallengeBuilder } from "./review-challenge.builder";

@Injectable()
export class GetSavedWordReviewChallengesUseCase {
  constructor(private readonly implementation: ReviewChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      ReviewChallengeBuilder["getSavedWordReviewChallenges"]
    >
  ) {
    return this.implementation.getSavedWordReviewChallenges(...arguments_);
  }
}
