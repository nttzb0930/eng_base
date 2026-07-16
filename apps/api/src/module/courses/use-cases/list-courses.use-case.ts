import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";

@Injectable()
export class ListCoursesUseCase extends CourseLearningMapper {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute() {
    const data = await this.prisma.courses.findMany();
    return data.map((x) => this.mapCourse(x));
  }
}
