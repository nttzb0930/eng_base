import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetListeningPracticeSummaryUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getListeningPracticeLevelSummary"]
    >
  ) {
    return this.implementation.getListeningPracticeLevelSummary(...arguments_);
  }
}
