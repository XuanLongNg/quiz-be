import { ConfigService } from '@base/configs/config.service';
import { IMailAttachment } from '@base/interfaces/mail.interface';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(
    private mailerService: MailerService,
    private readonly configs: ConfigService,
  ) {}

  async sendMail(
    from: string,
    to: string | string[],
    subject: string,
    template: string,
    context: Record<string, unknown>,
    bcc?: string[],
    cc?: string[],
    attachments?: IMailAttachment[],
  ) {
    if (typeof to === 'string')
      this.logger.log(`Send mail to ${to} with subject: ${subject}`);
    else {
      for (const email of to) {
        this.logger.log(`Send mail to ${email} with subject: ${subject}`);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const info = await this.mailerService.sendMail({
      from,
      to,
      bcc,
      cc,
      subject,
      template,
      context,
      attachments,
    });

    if (this.configs.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`Preview URL: ${previewUrl}`);
      }
    }
  }
}
