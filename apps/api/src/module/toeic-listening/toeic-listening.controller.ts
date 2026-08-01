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

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import {
  ToeicListeningDraftDto,
  ToeicListeningAnswerCheckDto,
  ToeicListeningPartQueryDto,
  ToeicListeningSubmissionDto,
} from "./dto/toeic-listening.dto";
import { DeleteToeicListeningDraftUseCase } from "./use-cases/delete-toeic-listening-draft.use-case";
import { GetToeicListeningDraftUseCase } from "./use-cases/get-toeic-listening-draft.use-case";
import { SaveToeicListeningDraftUseCase } from "./use-cases/save-toeic-listening-draft.use-case";
import { GetToeicListeningAttemptUseCase } from "./use-cases/get-toeic-listening-attempt.use-case";
import { ListToeicListeningAttemptsUseCase } from "./use-cases/list-toeic-listening-attempts.use-case";
import { SubmitToeicListeningAttemptUseCase } from "./use-cases/submit-toeic-listening-attempt.use-case";
import { GetToeicListeningOverviewUseCase } from "./use-cases/get-toeic-listening-overview.use-case";
import { GetToeicListeningTestUseCase } from "./use-cases/get-toeic-listening-test.use-case";
import { ListToeicListeningTestsUseCase } from "./use-cases/list-toeic-listening-tests.use-case";
import { CheckToeicListeningAnswerUseCase } from "./use-cases/check-toeic-listening-answer.use-case";

@Controller("toeic/listening")
@UseGuards(UserJwtGuard)
export class ToeicListeningController {
  constructor(
    private readonly getOverview: GetToeicListeningOverviewUseCase,
    private readonly listTests: ListToeicListeningTestsUseCase,
    private readonly getTest: GetToeicListeningTestUseCase,
    private readonly listAttempts: ListToeicListeningAttemptsUseCase,
    private readonly getAttempt: GetToeicListeningAttemptUseCase,
    private readonly submitAttempt: SubmitToeicListeningAttemptUseCase,
    private readonly getDraft: GetToeicListeningDraftUseCase,
    private readonly saveDraftUseCase: SaveToeicListeningDraftUseCase,
    private readonly deleteDraftUseCase: DeleteToeicListeningDraftUseCase,
    private readonly checkAnswerUseCase: CheckToeicListeningAnswerUseCase
  ) {}

  @Get("overview")
  overview() {
    return this.getOverview.execute();
  }

  @Get("tests")
  tests(
    @CurrentUserId() userId: string,
    @Query() query: ToeicListeningPartQueryDto
  ) {
    return this.listTests.execute(userId, query.part);
  }

  @Get("tests/:testId")
  test(
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicListeningPartQueryDto
  ) {
    return this.getTest.execute(testId, query.part);
  }

  @Get("tests/:testId/draft")
  draft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicListeningPartQueryDto
  ) {
    return this.getDraft.execute(userId, testId, query.part);
  }

  @Post("tests/:testId/check-answer")
  checkAnswer(
    @Param("testId", ParseIntPipe) testId: number,
    @Body() body: ToeicListeningAnswerCheckDto
  ) {
    return this.checkAnswerUseCase.execute(testId, body);
  }

  @Put("tests/:testId/draft")
  saveDraft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Body() body: ToeicListeningDraftDto
  ) {
    return this.saveDraftUseCase.execute(userId, testId, body);
  }

  @Delete("tests/:testId/draft")
  deleteDraft(
    @CurrentUserId() userId: string,
    @Param("testId", ParseIntPipe) testId: number,
    @Query() query: ToeicListeningPartQueryDto
  ) {
    return this.deleteDraftUseCase.execute(userId, testId, query.part);
  }

  @Post("attempts")
  submit(
    @CurrentUserId() userId: string,
    @Body() body: ToeicListeningSubmissionDto
  ) {
    return this.submitAttempt.execute(userId, body);
  }

  @Get("attempts")
  attempts(
    @CurrentUserId() userId: string,
    @Query() query: ToeicListeningPartQueryDto
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
