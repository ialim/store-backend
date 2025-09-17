import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const transportOptions: SMTPTransport.Options = {
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };
    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendMail(to: string, subject: string, text: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
    });
  }
}
