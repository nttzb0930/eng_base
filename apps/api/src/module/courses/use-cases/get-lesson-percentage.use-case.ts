import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetLessonPercentageUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<
      CourseLearningImplementation["getLessonPercentage"]
    >
  ) {
    return this.implementation.getLessonPercentage(...arguments_);
  }
}
