import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetFillBlankPracticeSummaryUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getFillBlankPracticeLevelSummary"]
    >
  ) {
    return this.implementation.getFillBlankPracticeLevelSummary(...arguments_);
  }
}
