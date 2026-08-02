import { Inject, Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authBadRequest } from "../auth-failure";
import type { RegisterDto } from "../dto/register.dto";
import { PasswordService } from "../service/password.service";
import { MailService } from "../../mail/mail.service";
import type { VerificationMailer } from "../../mail/mail.service";
import { VerificationCodeService } from "../service/verification-code.service";

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    @Inject(MailService)
    private readonly mailer: VerificationMailer,
    private readonly codes: VerificationCodeService
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

    const user = await this.prisma.users.create({
      data: {
        username,
        email,
        full_name: fullName,
        password: await this.passwords.hash(input.password),
        role: "USER",
      },
    });

    const generated = await this.codes.generate();
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        verification_code_hash: generated.hash,
        verification_code_expires_at: generated.expiresAt,
        verification_attempts: 0,
        verification_sent_at: generated.sentAt,
      },
    });

    try {
      await this.mailer.sendVerificationEmail({
        to: email,
        code: generated.code,
        expiresInMinutes: 10,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Verification email was not sent: ${reason}`);
    }

    return {
      success: true as const,
      verificationRequired: true as const,
      email,
    };
  }
}
