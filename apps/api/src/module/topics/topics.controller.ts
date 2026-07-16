import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { TopicsService } from "./topics.service";

@Controller("topics")
@UseGuards(UserJwtGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  getTopics() {
    return this.topicsService.getVocabularyTopics();
  }

  @Get(":slug")
  getTopicBySlug(
    @Param("slug") slug: string,
    @Query("level") level?: string
  ) {
    return this.topicsService.getVocabularyTopicBySlug(slug, level);
  }
}
