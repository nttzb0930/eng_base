import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetDictationPracticeChallengesUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getDictationPracticeChallenges"]
    >
  ) {
    return this.implementation.getDictationPracticeChallenges(...arguments_);
  }
}
