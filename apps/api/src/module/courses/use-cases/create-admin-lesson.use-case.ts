import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { LessonCreateDto } from "../dto/course-content-management.dto";
import {
  mapLesson,
  toLessonCreateData,
} from "../mappers/course-content.mapper";

@Injectable()
export class CreateAdminLessonUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: LessonCreateDto) {
    return mapLesson(
      await this.prisma.lessons.create({ data: toLessonCreateData(body) })
    );
  }
}
