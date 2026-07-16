import { Module } from "@nestjs/common";
import { UserJwtGuard } from "../../auth/user-jwt.guard";
import { CoursesModule } from "../courses/courses.module";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [CoursesModule],
  controllers: [ProgressController],
  providers: [ProgressService, UserJwtGuard],
})
export class ProgressModule {}
