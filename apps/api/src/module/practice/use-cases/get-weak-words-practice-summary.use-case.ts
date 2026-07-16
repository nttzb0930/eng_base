import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetWeakWordsPracticeSummaryUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getWeakWordsPracticeSummary"]
    >
  ) {
    return this.implementation.getWeakWordsPracticeSummary(...arguments_);
  }
}
