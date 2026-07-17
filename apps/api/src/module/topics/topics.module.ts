import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { TopicsController } from "./topics.controller";
import { GetVocabularyTopicUseCase } from "./use-cases/get-vocabulary-topic.use-case";
import { ListVocabularyTopicsUseCase } from "./use-cases/list-vocabulary-topics.use-case";

@Module({
  controllers: [TopicsController],
  providers: [
    GetVocabularyTopicUseCase,
    ListVocabularyTopicsUseCase,
    UserJwtGuard,
  ],
})
export class TopicsModule {}
