import { Injectable, Logger } from '@nestjs/common';
import {
  SESv2Client,
  SendEmailCommand,
  type SESv2ClientConfig,
} from '@aws-sdk/client-sesv2';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type SESTransport from 'nodemailer/lib/ses-transport';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const sesRegion = process.env.SES_REGION || process.env.AWS_REGION;
    if (sesRegion) {
      const accessKeyId =
        process.env.SES_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey =
        process.env.SES_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
      const sesConfig: SESv2ClientConfig = { region: sesRegion };
      if (accessKeyId && secretAccessKey) {
        sesConfig.credentials = { accessKeyId, secretAccessKey };
        this.logger.log(
          'EmailService configured with explicit SES credentials from environment variables',
        );
      }
      const ses = new SESv2Client(sesConfig);
      const sesTransportOptions: SESTransport.Options = {
        SES: { sesClient: ses, SendEmailCommand },
      };
      this.transporter = nodemailer.createTransport(
        sesTransportOptions as unknown as nodemailer.TransportOptions,
      );
      this.logger.log(
        `EmailService configured to use Amazon SES (region: ${sesRegion})`,
      );
      return;
    }

    if (process.env.SMTP_URL) {
      this.transporter = nodemailer.createTransport(process.env.SMTP_URL);
      this.logger.log('EmailService configured to use SMTP_URL transport');
      return;
    }

    const transportOptions: SMTPTransport.Options = {
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    };
    this.transporter = nodemailer.createTransport(transportOptions);
    this.logger.log('EmailService configured to use generic SMTP transport');
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<string | undefined> {
    const from = process.env.MAIL_FROM || 'no-reply@example.com';
    if (!process.env.MAIL_FROM) {
      this.logger.warn(
        'MAIL_FROM is not set; using fallback no-reply@example.com',
      );
    }
    const info = await this.transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    const messageId =
      // Nodemailer returns `messageId`; for SES transport, response contains the ID as well
      (info as { messageId?: string }).messageId ||
      (info as { response?: string }).response;
    if (messageId) {
      this.logger.log(
        `Email sent to ${to} (subject: ${subject}) with message ID: ${messageId}`,
      );
    } else {
      this.logger.log(`Email sent to ${to} (subject: ${subject})`);
    }
    return messageId;
  }
}
