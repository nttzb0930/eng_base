import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapCourse } from "../mappers/course-content.mapper";

@Injectable()
export class RemoveAdminCourseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapCourse(await this.prisma.courses.delete({ where: { id } }));
  }
}
