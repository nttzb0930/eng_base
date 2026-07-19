import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import {
  TopicDetailsQueryDto,
  TopicsQueryDto,
} from "./dto/topics-query.dto";
import { GetVocabularyTopicUseCase } from "./use-cases/get-vocabulary-topic.use-case";
import { ListVocabularyTopicsUseCase } from "./use-cases/list-vocabulary-topics.use-case";

@Controller("topics")
@UseGuards(UserJwtGuard)
export class TopicsController {
  constructor(
    private readonly listVocabularyTopics: ListVocabularyTopicsUseCase,
    private readonly getVocabularyTopic: GetVocabularyTopicUseCase
  ) {}

  @Get()
  getTopics(
    @CurrentUserId() userId: string,
    @Query() query: TopicsQueryDto,
  ) {
    return this.listVocabularyTopics.execute(userId, query.locale);
  }

  @Get(":slug")
  getTopicBySlug(
    @CurrentUserId() userId: string,
    @Param("slug") slug: string,
    @Query() query: TopicDetailsQueryDto,
  ) {
    return this.getVocabularyTopic.execute(
      userId,
      slug,
      query.level,
      query.locale,
    );
  }
}
