import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { LessonUpdateDto } from "../dto/course-content-management.dto";
import { mapLesson, toLessonData } from "../mappers/course-content.mapper";

@Injectable()
export class UpdateAdminLessonUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, body: LessonUpdateDto) {
    return mapLesson(
      await this.prisma.lessons.update({
        where: { id },
        data: toLessonData(body),
      })
    );
  }
}
