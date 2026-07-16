import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AuthModule } from "../auth";
import { AdminUsersController } from "./admin-users.controller";
import { UserManagementService } from "./user-management.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminUsersController],
  providers: [UserManagementService, AdminJwtGuard],
})
export class UserModule {}
