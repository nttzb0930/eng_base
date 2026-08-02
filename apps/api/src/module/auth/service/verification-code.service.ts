import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";

import { PasswordService } from "./password.service";

export const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class VerificationCodeService {
  constructor(private readonly passwords: PasswordService) {}

  async generate(now = new Date()) {
    const code = Array.from({ length: 6 }, () => randomInt(0, 10)).join("");
    return {
      code,
      hash: await this.passwords.hash(code),
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
      sentAt: now,
    };
  }

  verify(code: string, hash: string) {
    return this.passwords.verify(code, hash);
  }
}
