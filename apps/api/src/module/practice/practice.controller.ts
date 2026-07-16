import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { PracticeSessionResultInputDto } from "./dto/practice-session-result.dto";
import { CreatePracticeSessionResultUseCase } from "./use-cases/create-practice-session-result.use-case";
import { GetDictationPracticeChallengesUseCase } from "./use-cases/get-dictation-practice-challenges.use-case";
import { GetDictationPracticeSummaryUseCase } from "./use-cases/get-dictation-practice-summary.use-case";
import { GetFillBlankPracticeChallengesUseCase } from "./use-cases/get-fill-blank-practice-challenges.use-case";
import { GetFillBlankPracticeSummaryUseCase } from "./use-cases/get-fill-blank-practice-summary.use-case";
import { GetListeningPracticeChallengesUseCase } from "./use-cases/get-listening-practice-challenges.use-case";
import { GetListeningPracticeSummaryUseCase } from "./use-cases/get-listening-practice-summary.use-case";
import { GetWeakWordsPracticeChallengesUseCase } from "./use-cases/get-weak-words-practice-challenges.use-case";
import { GetWeakWordsPracticeSummaryUseCase } from "./use-cases/get-weak-words-practice-summary.use-case";

@Controller("practice")
@UseGuards(UserJwtGuard)
export class PracticeController {
  constructor(
    private readonly fillBlankSummary: GetFillBlankPracticeSummaryUseCase,
    private readonly fillBlankChallenges: GetFillBlankPracticeChallengesUseCase,
    private readonly listeningSummary: GetListeningPracticeSummaryUseCase,
    private readonly listeningChallenges: GetListeningPracticeChallengesUseCase,
    private readonly dictationSummary: GetDictationPracticeSummaryUseCase,
    private readonly dictationChallenges: GetDictationPracticeChallengesUseCase,
    private readonly weakWordsSummary: GetWeakWordsPracticeSummaryUseCase,
    private readonly weakWordsChallenges: GetWeakWordsPracticeChallengesUseCase,
    private readonly createSessionResult: CreatePracticeSessionResultUseCase
  ) {}

  @Get("fill-blank/summary")
  getFillBlankSummary(@CurrentUserId() userId: string) {
    return this.fillBlankSummary.execute(userId);
  }

  @Get("fill-blank/challenges")
  getFillBlankChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.fillBlankChallenges.execute(userId, level, lesson);
  }

  @Get("listening/summary")
  getListeningSummary(@CurrentUserId() userId: string) {
    return this.listeningSummary.execute(userId);
  }

  @Get("listening/challenges")
  getListeningChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.listeningChallenges.execute(userId, level, lesson);
  }

  @Get("dictation/summary")
  getDictationSummary(@CurrentUserId() userId: string) {
    return this.dictationSummary.execute(userId);
  }

  @Get("dictation/challenges")
  getDictationChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.dictationChallenges.execute(userId, level, lesson);
  }

  @Get("weak-words/summary")
  getWeakWordsSummary(@CurrentUserId() userId: string) {
    return this.weakWordsSummary.execute(userId);
  }

  @Get("weak-words/challenges")
  getWeakWordsChallenges(@CurrentUserId() userId: string) {
    return this.weakWordsChallenges.execute(userId);
  }

  @Post("sessions")
  createSession(
    @CurrentUserId() userId: string,
    @Body() body: PracticeSessionResultInputDto
  ) {
    return this.createSessionResult.execute(userId, body);
  }
}
