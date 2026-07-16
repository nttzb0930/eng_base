import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesService } from "./courses.service";

@Controller("courses")
@UseGuards(UserJwtGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getCourses() {
    return this.coursesService.getCourses();
  }

  @Get(":id")
  getCourseById(@Param("id", ParseIntPipe) id: number) {
    return this.coursesService.getCourseById(id);
  }
}
