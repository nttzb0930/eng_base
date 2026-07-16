import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesService } from "./courses.service";

@Controller("lessons")
@UseGuards(UserJwtGuard)
export class LessonsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getLesson(@Query("id") id?: string) {
    return this.coursesService.getLesson(id ? Number(id) : undefined);
  }
}
