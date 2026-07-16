import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { PasswordService } from "../../auth";
import type { UserUpdateDto } from "../dto/user-management.dto";
import { mapUser } from "../mappers/user.mapper";
import { assertUserIdentityAvailable } from "./user-identity.policy";

@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService
  ) {}

  async execute(id: string, body: UserUpdateDto) {
    if (body.username !== undefined || body.email !== undefined) {
      await assertUserIdentityAvailable(
        this.prisma,
        body.username,
        body.email,
        id
      );
    }
    return mapUser(
      await this.prisma.users.update({
        where: { id },
        data: {
          ...(body.username === undefined
            ? {}
            : { username: body.username.trim() }),
          ...(body.email === undefined
            ? {}
            : { email: body.email.trim().toLowerCase() }),
          ...(body.fullName === undefined
            ? {}
            : { full_name: body.fullName.trim() }),
          ...(body.role === undefined ? {} : { role: body.role }),
          ...(body.password === undefined || body.password.trim() === ""
            ? {}
            : { password: await this.passwords.hash(body.password) }),
        },
      })
    );
  }
}
