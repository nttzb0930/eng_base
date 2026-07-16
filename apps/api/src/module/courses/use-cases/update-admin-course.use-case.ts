import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { CourseUpdateDto } from "../dto/course-content-management.dto";
import { mapCourse, toCourseData } from "../mappers/course-content.mapper";

@Injectable()
export class UpdateAdminCourseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: CourseUpdateDto) {
    return mapCourse(
      await this.prisma.courses.update({
        where: { id },
        data: toCourseData(body),
      })
    );
  }
}
