import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetCourseProgressUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<CourseLearningImplementation["getCourseProgress"]>
  ) {
    return this.implementation.getCourseProgress(...arguments_);
  }
}
