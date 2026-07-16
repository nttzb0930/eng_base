import { Module } from "@nestjs/common";

import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AuthModule } from "../auth";
import { AdminUsersController } from "./admin-users.controller";
import { CreateAdminUserUseCase } from "./use-cases/create-admin-user.use-case";
import { GetAdminUserUseCase } from "./use-cases/get-admin-user.use-case";
import { ListAdminUsersUseCase } from "./use-cases/list-admin-users.use-case";
import { RemoveAdminUserUseCase } from "./use-cases/remove-admin-user.use-case";
import { UpdateAdminUserUseCase } from "./use-cases/update-admin-user.use-case";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminUsersController],
  providers: [
    ListAdminUsersUseCase,
    GetAdminUserUseCase,
    CreateAdminUserUseCase,
    UpdateAdminUserUseCase,
    RemoveAdminUserUseCase,
    AdminJwtGuard,
  ],
})
export class UserModule {}
