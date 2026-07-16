import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { PracticeService } from "./practice.service";
import { PracticeSessionResultInputDto } from "./dto/practice-session-result.dto";

@Controller("practice")
@UseGuards(UserJwtGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get("fill-blank/summary")
  getFillBlankSummary(@CurrentUserId() userId: string) {
    return this.practiceService.getFillBlankPracticeLevelSummary(userId);
  }

  @Get("fill-blank/challenges")
  getFillBlankChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getFillBlankPracticeChallenges(
      userId,
      level,
      lesson
    );
  }

  @Get("listening/summary")
  getListeningSummary(@CurrentUserId() userId: string) {
    return this.practiceService.getListeningPracticeLevelSummary(userId);
  }

  @Get("listening/challenges")
  getListeningChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getListeningPracticeChallenges(
      userId,
      level,
      lesson
    );
  }

  @Get("dictation/summary")
  getDictationSummary(@CurrentUserId() userId: string) {
    return this.practiceService.getDictationPracticeLevelSummary(userId);
  }

  @Get("dictation/challenges")
  getDictationChallenges(
    @CurrentUserId() userId: string,
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getDictationPracticeChallenges(
      userId,
      level,
      lesson
    );
  }

  @Get("weak-words/summary")
  getWeakWordsSummary(@CurrentUserId() userId: string) {
    return this.practiceService.getWeakWordsPracticeSummary(userId);
  }

  @Get("weak-words/challenges")
  getWeakWordsChallenges(@CurrentUserId() userId: string) {
    return this.practiceService.getWeakWordsPracticeChallenges(userId);
  }

  @Post("sessions")
  createSession(
    @CurrentUserId() userId: string,
    @Body() body: PracticeSessionResultInputDto
  ) {
    return this.practiceService.createPracticeSessionResult(userId, body);
  }
}
