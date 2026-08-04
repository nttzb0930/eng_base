import { Module } from "@nestjs/common";
import { ConfigModule, ConfigType } from "@nestjs/config";
import nodemailer from "nodemailer";

import mailConfig from "../../config/mail.config";
import { MAIL_TRANSPORT, MailService } from "./mail.service";

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [
    MailService,
    {
      provide: MAIL_TRANSPORT,
      inject: [mailConfig.KEY],
      useFactory: (config: ConfigType<typeof mailConfig>) =>
        nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.user
            ? {
                user: config.user,
                pass: config.pass,
              }
            : undefined,
        }),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
