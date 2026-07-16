import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetCurrentLessonUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<CourseLearningImplementation["getLesson"]>
  ) {
    return this.implementation.getLesson(...arguments_);
  }
}
