import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { VocabularyModule } from "../vocabulary/vocabulary.module";
import { ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";

@Module({
  imports: [VocabularyModule],
  controllers: [ReviewController],
  providers: [ReviewService, UserJwtGuard],
})
export class ReviewModule {}
