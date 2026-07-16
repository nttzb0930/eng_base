import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { CoursesModule } from "../courses";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [CoursesModule],
  controllers: [ProgressController],
  providers: [ProgressService, UserJwtGuard],
})
export class ProgressModule {}
