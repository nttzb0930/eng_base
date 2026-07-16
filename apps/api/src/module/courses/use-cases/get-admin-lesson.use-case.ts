import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapLesson } from "../mappers/course-content.mapper";

@Injectable()
export class GetAdminLessonUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const item = await this.prisma.lessons.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    return mapLesson(item);
  }
}
