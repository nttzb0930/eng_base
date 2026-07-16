import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { CoursesService } from "./courses.service";

@Controller("units")
@UseGuards(UserJwtGuard)
export class UnitsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getUnits() {
    return this.coursesService.getUnits();
  }
}
