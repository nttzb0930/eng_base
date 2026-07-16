import { Injectable } from "@nestjs/common";

import { CourseLearningImplementation } from "./course-learning.implementation";

@Injectable()
export class GetCourseUnitsUseCase {
  constructor(private readonly implementation: CourseLearningImplementation) {}

  execute(...arguments_: Parameters<CourseLearningImplementation["getUnits"]>) {
    return this.implementation.getUnits(...arguments_);
  }
}
