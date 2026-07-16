import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { PasswordService } from "../../auth";
import type { UserCreateDto } from "../dto/user-management.dto";
import { mapUser } from "../mappers/user.mapper";
import { assertUserIdentityAvailable } from "./user-identity.policy";

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService
  ) {}

  async execute(body: UserCreateDto) {
    await assertUserIdentityAvailable(this.prisma, body.username, body.email);
    return mapUser(
      await this.prisma.users.create({
        data: {
          username: body.username.trim(),
          email: body.email.trim().toLowerCase(),
          full_name: body.fullName.trim(),
          password: await this.passwords.hash(body.password),
          role: body.role,
        },
      })
    );
  }
}
