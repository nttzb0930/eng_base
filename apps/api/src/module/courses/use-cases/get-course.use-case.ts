import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetCourseUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(
    ...arguments_: Parameters<CourseLearningImplementation["getCourseById"]>
  ) {
    return this.implementation.getCourseById(...arguments_);
  }
}
