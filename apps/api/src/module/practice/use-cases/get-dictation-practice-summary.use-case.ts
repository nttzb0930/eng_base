import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetDictationPracticeSummaryUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getDictationPracticeLevelSummary"]
    >
  ) {
    return this.implementation.getDictationPracticeLevelSummary(...arguments_);
  }
}
