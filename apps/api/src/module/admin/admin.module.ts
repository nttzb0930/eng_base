import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AdminController } from "./admin.controller";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminService } from "./admin.service";
import { AdminJwtGuard } from "../auth";
import { PrismaModule } from "../../database/prisma/prisma.module";
import jwtConfig from "../../config/jwt.config";
import { PracticeModule } from "../practice/practice.module";

@Module({
  imports: [ConfigModule.forFeature(jwtConfig), PrismaModule, PracticeModule],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminJwtGuard],
})
export class AdminModule { }
