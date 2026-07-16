import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
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
      throw new BadRequestException("MISSING_FIELDS");
    }

    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) throw new BadRequestException("USER_ALREADY_EXISTS");

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
