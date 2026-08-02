import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authBadRequest } from "../auth-failure";
import { MailService } from "../../mail/mail.service";
import type { VerificationMailer } from "../../mail/mail.service";
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  VerificationCodeService,
} from "../service/verification-code.service";

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: VerificationCodeService,
    @Inject(MailService) private readonly mailer: VerificationMailer
  ) {}

  async execute(input: { email: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) throw authBadRequest("VERIFICATION_INVALID", "user_not_found");
    if (user.email_verified_at) return { success: true as const };

    if (
      user.verification_sent_at &&
      Date.now() - user.verification_sent_at.getTime() <
        EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
    ) {
      throw authBadRequest(
        "VERIFICATION_RATE_LIMITED",
        "verification_rate_limited"
      );
    }

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
    await this.mailer.sendVerificationEmail({
      to: email,
      code: generated.code,
      expiresInMinutes: 10,
    });
    return { success: true as const };
  }
}
