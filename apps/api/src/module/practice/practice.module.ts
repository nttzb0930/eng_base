import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { AdminPracticeSessionsController } from "./admin-practice-sessions.controller";
import { PracticeController } from "./practice.controller";
import { PracticeService } from "./practice.service";

@Module({
  controllers: [PracticeController, AdminPracticeSessionsController],
  providers: [PracticeService, UserJwtGuard, AdminJwtGuard],
  exports: [PracticeService],
})
export class PracticeModule {}
