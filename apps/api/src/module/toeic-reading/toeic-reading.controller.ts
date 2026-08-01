import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { GetToeicReadingOverviewUseCase } from "./use-cases/get-toeic-reading-overview.use-case";
import { GetToeicReadingTestUseCase } from "./use-cases/get-toeic-reading-test.use-case";
import { ListToeicReadingTestsUseCase } from "./use-cases/list-toeic-reading-tests.use-case";
import {
  ToeicReadingDraftDto,
  ToeicReadingPartQueryDto,
  ToeicReadingSubmissionDto,
} from "./dto/toeic-reading.dto";
import { GetToeicReadingAttemptUseCase } from "./use-cases/get-toeic-reading-attempt.use-case";
import { ListToeicReadingAttemptsUseCase } from "./use-cases/list-toeic-reading-attempts.use-case";
import { SubmitToeicReadingAttemptUseCase } from "./use-cases/submit-toeic-reading-attempt.use-case";
import { DeleteToeicReadingDraftUseCase } from "./use-cases/delete-toeic-reading-draft.use-case";
import { GetToeicReadingDraftUseCase } from "./use-cases/get-toeic-reading-draft.use-case";
import { SaveToeicReadingDraftUseCase } from "./use-cases/save-toeic-reading-draft.use-case";

@Controller("toeic/reading")
@UseGuards(UserJwtGuard)
export class ToeicReadingController {
  constructor(
    private readonly getOverview: GetToeicReadingOverviewUseCase,
    private readonly listTests: ListToeicReadingTestsUseCase,
    private readonly getTest: GetToeicReadingTestUseCase,
    private readonly listAttempts: ListToeicReadingAttemptsUseCase,
    private readonly getAttempt: GetToeicReadingAttemptUseCase,
    private readonly submitAttempt: SubmitToeicReadingAttemptUseCase,
    private readonly getDraft: GetToeicReadingDraftUseCase,
    private readonly saveReadingDraft: SaveToeicReadingDraftUseCase,
    private readonly deleteReadingDraft: DeleteToeicReadingDraftUseCase
  ) {}

  @Get("overview")
  overview(@CurrentUserId() userId: string) {
    return this.getOverview.execute(userId);
  }

  @Get("tests")
  tests(
    @CurrentUserId() userId: string,
    @Query() query: ToeicReadingPartQueryDto
  ) {
    return this.listTests.execute(userId, query.part);
  }

  @Get("tests/:testId")
  test(
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicReadingPartQueryDto
  ) {
    return this.getTest.execute(testId, query.part);
  }

  @Get("tests/:testId/draft")
  draft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicReadingPartQueryDto
  ) {
    return this.getDraft.execute(userId, testId, query.part);
  }

  @Put("tests/:testId/draft")
  saveDraft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Body() body: ToeicReadingDraftDto
  ) {
    return this.saveReadingDraft.execute(userId, testId, body);
  }

  @Delete("tests/:testId/draft")
  deleteDraft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicReadingPartQueryDto
  ) {
    return this.deleteReadingDraft.execute(userId, testId, query.part);
  }

  @Post("attempts")
  submit(
    @CurrentUserId() userId: string,
    @Body() body: ToeicReadingSubmissionDto
  ) {
    return this.submitAttempt.execute(userId, body);
  }

  @Get("attempts")
  attempts(
    @CurrentUserId() userId: string,
    @Query() query: ToeicReadingPartQueryDto
  ) {
    return this.listAttempts.execute(userId, query.part);
  }

  @Get("attempts/:attemptId")
  attempt(
    @CurrentUserId() userId: string,
    @Param("attemptId", ParseIntPipe) attemptId: number
  ) {
    return this.getAttempt.execute(userId, attemptId);
  }
}
