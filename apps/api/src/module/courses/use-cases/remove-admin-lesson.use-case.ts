import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapLesson } from "../mappers/course-content.mapper";

@Injectable()
export class RemoveAdminLessonUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapLesson(await this.prisma.lessons.delete({ where: { id } }));
  }
}
