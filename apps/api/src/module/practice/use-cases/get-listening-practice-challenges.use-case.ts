import { Injectable } from "@nestjs/common";

import { PracticeChallengeBuilder } from "./practice-challenge.builder";

@Injectable()
export class GetListeningPracticeChallengesUseCase {
  constructor(private readonly implementation: PracticeChallengeBuilder) {}

  execute(
    ...arguments_: Parameters<
      PracticeChallengeBuilder["getListeningPracticeChallenges"]
    >
  ) {
    return this.implementation.getListeningPracticeChallenges(...arguments_);
  }
}
