import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapCourse } from "../mappers/course-content.mapper";

@Injectable()
export class GetAdminCourseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const item = await this.prisma.courses.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return mapCourse(item);
  }
}
