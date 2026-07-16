import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetUserProgressUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<CourseLearningImplementation["getUserProgress"]>
  ) {
    return this.implementation.getUserProgress(...arguments_);
  }
}
