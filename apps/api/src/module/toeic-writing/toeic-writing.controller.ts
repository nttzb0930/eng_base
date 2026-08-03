import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { ToeicWritingPartQueryDto } from "./dto/toeic-writing.dto";
import { GetToeicWritingOverviewUseCase } from "./use-cases/get-toeic-writing-overview.use-case";
import { GetToeicWritingTaskUseCase } from "./use-cases/get-toeic-writing-task.use-case";
import { ListToeicWritingTasksUseCase } from "./use-cases/list-toeic-writing-tasks.use-case";

@Controller("toeic/writing")
@UseGuards(UserJwtGuard)
export class ToeicWritingController {
  constructor(
    private readonly getOverview: GetToeicWritingOverviewUseCase,
    private readonly listTasks: ListToeicWritingTasksUseCase,
    private readonly getTask: GetToeicWritingTaskUseCase
  ) {}

  @Get("overview")
  overview(@CurrentUserId() userId: string) {
    return this.getOverview.execute(userId);
  }

  @Get("tasks")
  tasks(
    @CurrentUserId() userId: string,
    @Query() query: ToeicWritingPartQueryDto
  ) {
    return this.listTasks.execute(userId, query.part);
  }

  @Get("tasks/:taskId")
  task(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number
  ) {
    return this.getTask.execute(userId, taskId);
  }
}
