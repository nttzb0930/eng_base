import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";

import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import {
  ToeicGrammarAnswerDto,
  ToeicGrammarPracticeQueryDto,
} from "./dto/toeic-grammar.dto";
import { GetToeicGrammarCatalogUseCase } from "./use-cases/get-toeic-grammar-catalog.use-case";
import { GetToeicGrammarPracticeUseCase } from "./use-cases/get-toeic-grammar-practice.use-case";
import { SubmitToeicGrammarAnswerUseCase } from "./use-cases/submit-toeic-grammar-answer.use-case";

@Controller("toeic/grammar")
@UseGuards(UserJwtGuard)
export class ToeicGrammarController {
  constructor(
    private readonly getCatalog: GetToeicGrammarCatalogUseCase,
    private readonly getPractice: GetToeicGrammarPracticeUseCase,
    private readonly submitAnswer: SubmitToeicGrammarAnswerUseCase
  ) {}

  @Get("catalog")
  catalog(@CurrentUserId() userId: string) {
    return this.getCatalog.execute(userId);
  }

  @Get("practice")
  practice(
    @CurrentUserId() userId: string,
    @Query() query: ToeicGrammarPracticeQueryDto
  ) {
    return this.getPractice.execute(userId, query.mode, query.target);
  }

  @Post("answers")
  submit(@CurrentUserId() userId: string, @Body() body: ToeicGrammarAnswerDto) {
    return this.submitAnswer.execute(userId, body);
  }
}
