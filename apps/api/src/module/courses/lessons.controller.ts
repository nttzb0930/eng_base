import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetCurrentLessonUseCase } from "./use-cases/get-current-lesson.use-case";

@Controller("lessons")
@UseGuards(UserJwtGuard)
export class LessonsController {
  constructor(private readonly getCurrentLesson: GetCurrentLessonUseCase) {}

  @Get()
  getLesson(@CurrentUserId() userId: string, @Query("id") id?: string) {
    return this.getCurrentLesson.execute(userId, id ? Number(id) : undefined);
  }
}
