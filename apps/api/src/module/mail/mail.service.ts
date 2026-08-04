import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import mailConfig from "../../config/mail.config";

export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");

export interface MailTransport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ messageId?: string }>;
}

export interface RegistrationMailer {
  sendRegistrationEmail(input: { to: string; fullName: string }): Promise<void>;
}

export interface VerificationMailer {
  sendVerificationEmail(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}

export interface PasswordResetMailer {
  sendPasswordResetEmail(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}

@Injectable()
export class MailService
  implements RegistrationMailer, VerificationMailer, PasswordResetMailer
{
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport
  ) {}

  async sendRegistrationEmail(input: {
    to: string;
    fullName: string;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: input.to,
      template: "registration",
      subject: `Chào mừng bạn đến với ${this.config.appName}`,
      variables: {
        fullName: input.fullName,
        appName: this.config.appName,
      },
    });
  }

  async sendVerificationEmail(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: input.to,
      template: "verification",
      subject: "Xác thực email đăng ký English Base",
      variables: {
        code: input.code,
        expiresInMinutes: input.expiresInMinutes,
        appName: this.config.appName,
      },
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    await this.sendTemplateEmail({
      to: input.to,
      template: "password-reset",
      subject: "Đặt lại mật khẩu English Base",
      variables: {
        code: input.code,
        expiresInMinutes: input.expiresInMinutes,
        appName: this.config.appName,
      },
    });
  }

  private async sendTemplateEmail(input: {
    to: string;
    template: string;
    subject: string;
    variables: Record<string, string | number>;
  }) {
    if (!this.config.enabled) {
      this.logger.debug("SMTP is disabled; skipping email delivery");
      return;
    }

    const text = this.renderTemplate(input.template, input.variables, false);
    const html = this.renderTemplate(input.template, input.variables, true);

    try {
      const result = await this.transport.sendMail({
        from: this.config.from,
        to: input.to,
        subject: input.subject,
        text,
        html,
      });
      this.logger.log(
        `Email sent to ${input.to}${
          result.messageId ? ` (${result.messageId})` : ""
        }`
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email delivery failed for ${input.to}: ${reason}`);
      throw error;
    }
  }

  private renderTemplate(
    name: string,
    variables: Record<string, string | number>,
    html: boolean
  ) {
    const extension = html ? "html" : "txt";
    const source = readFileSync(
      this.resolveTemplate(name, extension),
      "utf8"
    ).trim();
    return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
      const value = String(variables[key] ?? "");
      return html ? escapeHtml(value) : value;
    });
  }

  private resolveTemplate(name: string, extension: string) {
    const configured = this.config.templatesPath;
    const configuredPath = isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured);
    const candidates = [
      join(configuredPath, `${name}.${extension}`),
      resolve(process.cwd(), "apps/api", configured, `${name}.${extension}`),
      join(__dirname, "templates", `${name}.${extension}`),
    ];
    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(
        `Email template '${name}.${extension}' not found in ${candidates.join(", ")}`
      );
    }
    return match;
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character
  );
}
