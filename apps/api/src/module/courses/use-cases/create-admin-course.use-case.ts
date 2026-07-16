import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { CourseCreateDto } from "../dto/course-content-management.dto";
import {
  mapCourse,
  toCourseCreateData,
} from "../mappers/course-content.mapper";

@Injectable()
export class CreateAdminCourseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: CourseCreateDto) {
    return mapCourse(
      await this.prisma.courses.create({ data: toCourseCreateData(body) })
    );
  }
}
