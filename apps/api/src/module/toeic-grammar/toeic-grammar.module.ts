import { Module } from "@nestjs/common";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { ToeicGrammarController } from "./toeic-grammar.controller";
import { GetToeicGrammarCatalogUseCase } from "./use-cases/get-toeic-grammar-catalog.use-case";
import { GetToeicGrammarPracticeUseCase } from "./use-cases/get-toeic-grammar-practice.use-case";
import { SubmitToeicGrammarAnswerUseCase } from "./use-cases/submit-toeic-grammar-answer.use-case";

@Module({
  controllers: [ToeicGrammarController],
  providers: [
    GetToeicGrammarCatalogUseCase,
    GetToeicGrammarPracticeUseCase,
    SubmitToeicGrammarAnswerUseCase,
    UserJwtGuard,
  ],
})
export class ToeicGrammarModule {}
