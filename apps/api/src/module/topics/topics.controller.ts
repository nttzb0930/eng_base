import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator";
import { TopicsService } from "./topics.service";

@Controller("topics")
@UseGuards(UserJwtGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  getTopics(@CurrentUserId() userId: string) {
    return this.topicsService.getVocabularyTopics(userId);
  }

  @Get(":slug")
  getTopicBySlug(
    @CurrentUserId() userId: string,
    @Param("slug") slug: string,
    @Query("level") level?: string
  ) {
    return this.topicsService.getVocabularyTopicBySlug(userId, slug, level);
  }
}
