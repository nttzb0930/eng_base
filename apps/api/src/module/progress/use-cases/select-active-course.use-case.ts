import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { GetCourseUseCase, GetUserProgressUseCase } from "../../courses";

@Injectable()
export class SelectActiveCourseUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getCourse: GetCourseUseCase,
    private readonly getUserProgress: GetUserProgressUseCase
  ) {}

  async execute(userId: string, courseId: number) {
    const [user, course, existingProgress] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId } }),
      this.getCourse.execute(courseId),
      this.getUserProgress.execute(userId),
    ]);
    if (!user) throw new NotFoundException("User not found.");
    if (!course) throw new NotFoundException("Course not found.");
    if (!course.units.length || !course.units[0].lessons.length) {
      throw new BadRequestException("Course is empty.");
    }

    const data = {
      active_course_id: courseId,
      user_name: user.full_name || user.username || "User",
      user_image_src: "/mascot.svg",
    };
    if (existingProgress) {
      await this.prisma.user_progress.update({
        where: { user_id: userId },
        data,
      });
      return;
    }
    await this.prisma.user_progress.create({
      data: { user_id: userId, ...data },
    });
  }
}
