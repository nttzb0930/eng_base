import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { VocabularyModule } from "../vocabulary";
import { ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";

@Module({
  imports: [VocabularyModule],
  controllers: [ReviewController],
  providers: [ReviewService, UserJwtGuard],
})
export class ReviewModule {}
