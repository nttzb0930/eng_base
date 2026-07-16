import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { CoursesService } from "./courses.service";

@Controller("lessons")
@UseGuards(UserJwtGuard)
export class LessonsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getLesson(@CurrentUserId() userId: string, @Query("id") id?: string) {
    return this.coursesService.getLesson(userId, id ? Number(id) : undefined);
  }
}
