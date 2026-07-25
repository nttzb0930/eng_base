import { TOPIC_PRACTICE_MODES, type TopicPracticeMode } from "@repo/shared";
import { IsIn } from "class-validator";

export class TopicPracticeQueryDto {
  @IsIn(TOPIC_PRACTICE_MODES)
  mode: TopicPracticeMode = "all";
}
