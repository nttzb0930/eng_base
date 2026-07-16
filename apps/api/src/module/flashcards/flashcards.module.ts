import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardsService } from "./flashcards.service";

@Module({
  controllers: [FlashcardsController],
  providers: [FlashcardsService, UserJwtGuard],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
