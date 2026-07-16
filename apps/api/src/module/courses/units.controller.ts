import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { GetCourseUnitsUseCase } from "./use-cases/get-course-units.use-case";

@Controller("units")
@UseGuards(UserJwtGuard)
export class UnitsController {
  constructor(private readonly getCourseUnits: GetCourseUnitsUseCase) {}

  @Get()
  getUnits(@CurrentUserId() userId: string) {
    return this.getCourseUnits.execute(userId);
  }
}
