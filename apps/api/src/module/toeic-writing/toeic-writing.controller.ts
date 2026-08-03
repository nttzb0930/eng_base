import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseEnumPipe,
  Post,
  Query,
  Put,
  UseGuards,
} from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { WritingAiRateLimit } from "../../common/decorators/writing-ai-rate-limit.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  ToeicWritingDraftDto,
  ToeicWritingAssistanceDto,
  ToeicWritingAssistanceKind,
  ToeicWritingGradeHistoryQueryDto,
  ToeicWritingPartOneGradeDto,
  ToeicWritingPartQueryDto,
  ToeicWritingSubmissionDto,
} from "./dto/toeic-writing.dto";
import { DeleteToeicWritingDraftUseCase } from "./use-cases/delete-toeic-writing-draft.use-case";
import { GetToeicWritingDraftUseCase } from "./use-cases/get-toeic-writing-draft.use-case";
import { GetToeicWritingOverviewUseCase } from "./use-cases/get-toeic-writing-overview.use-case";
import { GetToeicWritingSubmissionUseCase } from "./use-cases/get-toeic-writing-submission.use-case";
import { GetToeicWritingTaskUseCase } from "./use-cases/get-toeic-writing-task.use-case";
import { GradeToeicWritingPartOneUseCase } from "./use-cases/grade-toeic-writing-part-one.use-case";
import { GetToeicWritingQuotaUseCase } from "./use-cases/get-toeic-writing-quota.use-case";
import { GetToeicWritingGradeUseCase } from "./use-cases/get-toeic-writing-grade.use-case";
import { ListToeicWritingGradesUseCase } from "./use-cases/list-toeic-writing-grades.use-case";
import { RecordToeicWritingAssistanceUseCase } from "./use-cases/record-toeic-writing-assistance.use-case";
import { ListToeicWritingTasksUseCase } from "./use-cases/list-toeic-writing-tasks.use-case";
import { SaveToeicWritingDraftUseCase } from "./use-cases/save-toeic-writing-draft.use-case";
import { SubmitToeicWritingTaskUseCase } from "./use-cases/submit-toeic-writing-task.use-case";

@Controller("toeic/writing")
@UseGuards(UserJwtGuard)
export class ToeicWritingController {
  constructor(
    private readonly getOverview: GetToeicWritingOverviewUseCase,
    private readonly listTasks: ListToeicWritingTasksUseCase,
    private readonly getTask: GetToeicWritingTaskUseCase,
    private readonly getDraft: GetToeicWritingDraftUseCase,
    private readonly saveWritingDraft: SaveToeicWritingDraftUseCase,
    private readonly deleteWritingDraft: DeleteToeicWritingDraftUseCase,
    private readonly submitWritingTask: SubmitToeicWritingTaskUseCase,
    private readonly getSubmission: GetToeicWritingSubmissionUseCase,
    private readonly gradePartOne: GradeToeicWritingPartOneUseCase,
    private readonly getWritingQuota: GetToeicWritingQuotaUseCase,
    private readonly getWritingGrade: GetToeicWritingGradeUseCase,
    private readonly listWritingGrades: ListToeicWritingGradesUseCase,
    private readonly recordWritingAssistance: RecordToeicWritingAssistanceUseCase
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

  @Get("tasks/:taskId/draft")
  draft(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number
  ) {
    return this.getDraft.execute(userId, taskId);
  }

  @Put("tasks/:taskId/draft")
  saveDraft(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Body() body: ToeicWritingDraftDto
  ) {
    return this.saveWritingDraft.execute(userId, taskId, body);
  }

  @Delete("tasks/:taskId/draft")
  deleteDraft(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number
  ) {
    return this.deleteWritingDraft.execute(userId, taskId);
  }

  @Post("tasks/:taskId/submissions")
  submit(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Body() body: ToeicWritingSubmissionDto
  ) {
    return this.submitWritingTask.execute(userId, taskId, body);
  }

  @Post("tasks/:taskId/grades/part-one")
  @WritingAiRateLimit()
  gradeWritingPartOne(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Body() body: ToeicWritingPartOneGradeDto
  ) {
    return this.gradePartOne.execute(userId, taskId, body);
  }

  @Get("ai-quota")
  writingQuota(@CurrentUserId() userId: string) {
    return this.getWritingQuota.execute(userId);
  }

  @Get("grades/:gradeId")
  grade(
    @CurrentUserId() userId: string,
    @Param("gradeId", ParseIntPipe) gradeId: number
  ) {
    return this.getWritingGrade.execute(userId, gradeId);
  }

  @Get("tasks/:taskId/grades")
  grades(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Query() query: ToeicWritingGradeHistoryQueryDto
  ) {
    return this.listWritingGrades.execute(
      userId,
      taskId,
      query.cursor,
      query.limit
    );
  }

  @Post("tasks/:taskId/assistance/:kind")
  recordAssistance(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseIntPipe) taskId: number,
    @Param("kind", new ParseEnumPipe(ToeicWritingAssistanceKind))
    kind: ToeicWritingAssistanceKind,
    @Body() body: ToeicWritingAssistanceDto
  ) {
    return this.recordWritingAssistance.execute(
      userId,
      taskId,
      body.contentVersion,
      kind
    );
  }

  @Get("submissions/:submissionId")
  submission(
    @CurrentUserId() userId: string,
    @Param("submissionId", ParseIntPipe) submissionId: number
  ) {
    return this.getSubmission.execute(userId, submissionId);
  }
}
