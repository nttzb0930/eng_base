import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AuthModule } from "../auth";
import { PracticeModule } from "../practice/practice.module";

@Module({
  imports: [AuthModule, PrismaModule, PracticeModule],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtGuard],
})
export class AdminModule { }
