import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";

@Injectable()
export class GetCourseUseCase extends CourseLearningMapper {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(courseId: number) {
    const data = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        units: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!data) return null;

    const course = this.mapCourse(data);
    return {
      ...course,
      units: data.units.map((unit) => ({
        ...this.mapUnitRecord(unit),
        lessons: unit.lessons.map((x) => this.mapLessonRecord(x)),
      })),
    };
  }
}
