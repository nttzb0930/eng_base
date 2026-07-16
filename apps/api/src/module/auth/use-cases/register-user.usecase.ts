import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authBadRequest } from "../auth-failure";
import type { RegisterDto } from "../dto/register.dto";
import { PasswordService } from "../service/password.service";

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService
  ) {}

  async execute(input: RegisterDto) {
    const username = input.username?.trim();
    const email = input.email?.trim().toLowerCase();
    const fullName = input.fullName?.trim();
    if (!username || !email || !input.password || !fullName) {
      throw authBadRequest("MISSING_FIELDS", "missing_registration_fields");
    }

    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      throw authBadRequest("USER_ALREADY_EXISTS", "identity_already_exists");
    }

    await this.prisma.users.create({
      data: {
        username,
        email,
        full_name: fullName,
        password: await this.passwords.hash(input.password),
        role: "USER",
      },
    });
    return { success: true as const };
  }
}
