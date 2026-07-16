import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<CourseLearningImplementation["getTopTenUsers"]>
  ) {
    return this.implementation.getTopTenUsers(...arguments_);
  }
}
