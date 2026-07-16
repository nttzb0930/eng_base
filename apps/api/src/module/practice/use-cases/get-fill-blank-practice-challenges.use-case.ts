import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetFillBlankPracticeChallengesUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getFillBlankPracticeChallenges"]
    >
  ) {
    return this.implementation.getFillBlankPracticeChallenges(...arguments_);
  }
}
