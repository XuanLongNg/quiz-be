import { ConfigService } from '@base/configs/config.service';
import { MailService } from '@base/mail/mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configs: ConfigService) => {
        let transport = configs.MAIL;

        if (configs.NODE_ENV === 'development') {
          const testAccount = await nodemailer.createTestAccount();
          transport = {
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          };
        }

        return {
          transport,
          template: {
            dir: join(__dirname, '..', '..', 'common', 'templates', 'mails'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
