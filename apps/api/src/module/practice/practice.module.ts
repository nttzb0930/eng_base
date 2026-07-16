import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { PracticeController } from "./practice.controller";
import { PracticeService } from "./practice.service";

@Module({
  controllers: [PracticeController],
  providers: [PracticeService, UserJwtGuard],
  exports: [PracticeService],
})
export class PracticeModule {}
