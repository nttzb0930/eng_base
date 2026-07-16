import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";

@Injectable()
export class GetUserProgressUseCase extends CourseLearningMapper {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute(userId: string) {
    const data = await this.prisma.user_progress.findUnique({
      where: { user_id: userId },
      include: {
        courses: true,
      },
    });

    const session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
      select: { status: true },
    });
    const isConfirmed = session?.status === "CONFIRMED";

    if (data) return this.mapUserProgress(data, isConfirmed);

    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    const userName = dbUser?.full_name || dbUser?.username || "User";
    const syncedProgress = await this.prisma.user_progress.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        active_course_id: null,
        user_name: userName,
        user_image_src: "/mascot.svg",
      },
      update: {
        user_name: userName,
        user_image_src: "/mascot.svg",
      },
      include: {
        courses: true,
      },
    });

    return this.mapUserProgress(syncedProgress, isConfirmed);
  }
}
