import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { PracticeService } from "./practice.service";
import { PracticeSessionResultInputDto } from "./dto/practice-session-result.dto";

@Controller("practice")
@UseGuards(UserJwtGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get("fill-blank/summary")
  getFillBlankSummary() {
    return this.practiceService.getFillBlankPracticeLevelSummary();
  }

  @Get("fill-blank/challenges")
  getFillBlankChallenges(
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getFillBlankPracticeChallenges(level, lesson);
  }

  @Get("listening/summary")
  getListeningSummary() {
    return this.practiceService.getListeningPracticeLevelSummary();
  }

  @Get("listening/challenges")
  getListeningChallenges(
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getListeningPracticeChallenges(level, lesson);
  }

  @Get("dictation/summary")
  getDictationSummary() {
    return this.practiceService.getDictationPracticeLevelSummary();
  }

  @Get("dictation/challenges")
  getDictationChallenges(
    @Query("level") level?: string,
    @Query("lesson") lesson?: string
  ) {
    return this.practiceService.getDictationPracticeChallenges(level, lesson);
  }

  @Get("weak-words/summary")
  getWeakWordsSummary() {
    return this.practiceService.getWeakWordsPracticeSummary();
  }

  @Get("weak-words/challenges")
  getWeakWordsChallenges() {
    return this.practiceService.getWeakWordsPracticeChallenges();
  }

  @Post("sessions")
  createSession(@Body() body: PracticeSessionResultInputDto) {
    return this.practiceService.createPracticeSessionResult(body);
  }
}
