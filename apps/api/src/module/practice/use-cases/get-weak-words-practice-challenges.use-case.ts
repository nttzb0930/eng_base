import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetWeakWordsPracticeChallengesUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getWeakWordsPracticeChallenges"]
    >
  ) {
    return this.implementation.getWeakWordsPracticeChallenges(...arguments_);
  }
}
