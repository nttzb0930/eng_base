import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { MailService, type PasswordResetMailer } from "../../mail/mail.service";
import { VerificationCodeService } from "../service/verification-code.service";

export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: VerificationCodeService,
    @Inject(MailService) private readonly mailer: PasswordResetMailer
  ) {}

  async execute(input: { email: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (user) {
      const sentAt = user.password_reset_sent_at?.getTime() ?? 0;
      if (Date.now() - sentAt >= PASSWORD_RESET_RESEND_COOLDOWN_MS) {
        const generated = await this.codes.generate();
        await this.prisma.users.update({
          where: { id: user.id },
          data: {
            password_reset_code_hash: generated.hash,
            password_reset_code_expires_at: generated.expiresAt,
            password_reset_attempts: 0,
            password_reset_sent_at: generated.sentAt,
          },
        });
        try {
          await this.mailer.sendPasswordResetEmail({
            to: email,
            code: generated.code,
            expiresInMinutes: 10,
          });
        } catch {
          // Keep the response identical for existing and unknown emails.
        }
      }
    }

    return { success: true as const };
  }
}
