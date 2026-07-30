import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  ReadingLevelQueryDto,
  ReadingSubmissionDto,
} from "./dto/reading.dto";
import { GetReadingAttemptUseCase } from "./use-cases/get-reading-attempt.use-case";
import { GetReadingPassageUseCase } from "./use-cases/get-reading-passage.use-case";
import { ListReadingAttemptsUseCase } from "./use-cases/list-reading-attempts.use-case";
import { ListReadingPassagesUseCase } from "./use-cases/list-reading-passages.use-case";
import { SubmitReadingAttemptUseCase } from "./use-cases/submit-reading-attempt.use-case";

@Controller("reading")
@UseGuards(UserJwtGuard)
export class ReadingController {
  constructor(
    private readonly listPassages: ListReadingPassagesUseCase,
    private readonly getPassage: GetReadingPassageUseCase,
    private readonly listAttempts: ListReadingAttemptsUseCase,
    private readonly getAttempt: GetReadingAttemptUseCase,
    private readonly submitAttemptGoal: SubmitReadingAttemptUseCase,
  ) {}

  @Get("passages")
  list(
    @CurrentUserId() userId: string,
    @Query() query: ReadingLevelQueryDto,
  ) {
    return this.listPassages.execute(userId, query.level);
  }

  @Get("passages/:slug")
  get(@Param("slug") slug: string) {
    return this.getPassage.execute(slug);
  }

  @Get("attempts")
  history(
    @CurrentUserId() userId: string,
    @Query() query: ReadingLevelQueryDto,
  ) {
    return this.listAttempts.execute(userId, query.level);
  }

  @Get("attempts/:attemptId")
  result(
    @CurrentUserId() userId: string,
    @Param("attemptId", ParseIntPipe) attemptId: number,
  ) {
    return this.getAttempt.execute(userId, attemptId);
  }

  @Post("passages/:passageId/attempts")
  submitAttempt(
    @CurrentUserId() userId: string,
    @Param("passageId", ParseIntPipe) passageId: number,
    @Body() body: ReadingSubmissionDto,
  ) {
    return this.submitAttemptGoal.execute(userId, passageId, body);
  }
}
