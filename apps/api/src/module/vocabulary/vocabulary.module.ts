import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../auth";
import { VocabularyController } from "./vocabulary.controller";
import { VocabularyService } from "./vocabulary.service";

@Module({
  controllers: [VocabularyController],
  providers: [VocabularyService, UserJwtGuard],
  exports: [VocabularyService],
})
export class VocabularyModule {}
