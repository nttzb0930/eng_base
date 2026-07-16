import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { CoursesService } from "./courses.service";

@Controller("units")
@UseGuards(UserJwtGuard)
export class UnitsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  getUnits(@CurrentUserId() userId: string) {
    return this.coursesService.getUnits(userId);
  }
}
