import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { TopicsController } from "./topics.controller";
import { TopicsService } from "./topics.service";

@Module({
  controllers: [TopicsController],
  providers: [TopicsService, UserJwtGuard],
})
export class TopicsModule {}
