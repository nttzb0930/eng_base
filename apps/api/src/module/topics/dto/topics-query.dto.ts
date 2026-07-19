import { IsIn, IsOptional } from "class-validator";

import { TOPIC_LOCALES, type TopicLocale } from "../topic-locale";
import {
  PRACTICE_CEFR_LEVELS,
  type PracticeCefrLevel,
} from "../use-cases/topic-source";

export class TopicsQueryDto {
  @IsOptional()
  @IsIn(TOPIC_LOCALES)
  locale: TopicLocale = "en";
}

export class TopicDetailsQueryDto extends TopicsQueryDto {
  @IsOptional()
  @IsIn(PRACTICE_CEFR_LEVELS)
  level?: PracticeCefrLevel;
}
