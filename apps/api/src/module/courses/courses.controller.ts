import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { GetCourseUseCase } from "./use-cases/get-course.use-case";
import { ListCoursesUseCase } from "./use-cases/list-courses.use-case";

@Controller("courses")
@UseGuards(UserJwtGuard)
export class CoursesController {
  constructor(
    private readonly listCourses: ListCoursesUseCase,
    private readonly getCourse: GetCourseUseCase
  ) {}

  @Get()
  getCourses() {
    return this.listCourses.execute();
  }

  @Get(":id")
  getCourseById(@Param("id", ParseIntPipe) id: number) {
    return this.getCourse.execute(id);
  }
}
