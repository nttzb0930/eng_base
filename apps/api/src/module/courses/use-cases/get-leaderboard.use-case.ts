import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CourseLearningMapper } from "./course-learning.mapper";

@Injectable()
export class GetLeaderboardUseCase extends CourseLearningMapper {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async execute() {
    const data = await this.prisma.user_progress.findMany({
      orderBy: { points: "desc" },
      take: 10,
    });

    return data.map((progress) => ({
      userId: progress.user_id,
      userName: progress.user_name,
      userImageSrc: progress.user_image_src,
      points: progress.points,
    }));
  }
}
