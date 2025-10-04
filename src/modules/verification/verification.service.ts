import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async sendEmailVerification(userId: string): Promise<boolean> {
    const token = uuidv4();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: expiry,
      },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const frontendBase = process.env.FRONTEND_URL ?? '';
    const link = frontendBase
      ? `${frontendBase.replace(/\/$/, '')}/verify-email?token=${token}`
      : `https://example.com/verify-email?token=${token}`;
    const subject = 'Verify Your Email';
    const text = `Hi ${user.email},\n\nPlease verify your email address by visiting the link below:\n${link}\n\nIf you did not create an account, you can ignore this email.`;
    const html = `
      <p>Hi ${user.email},</p>
      <p>Please verify your email address by clicking the button below.</p>
      <p><a href="${link}" style="display:inline-block;padding:8px 16px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;">Verify Email</a></p>
      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you did not create an account, you can safely ignore this message.</p>
    `;
    await this.emailService.sendMail(user.email, subject, text, html);
    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
    if (
      !user ||
      !user.emailVerificationTokenExpiry ||
      user.emailVerificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });
    return true;
  }

  async sendPhoneVerification(userId: string): Promise<boolean> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile || !profile.phone)
      throw new BadRequestException('Phone not found');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        phoneVerificationCode: code,
        phoneVerificationCodeExpiry: expiry,
      },
    });
    await this.smsService.sendSms(
      profile.phone,
      `Your verification code is: ${code}`,
    );
    return true;
  }

  async verifyPhone(userId: string, code: string): Promise<boolean> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (
      !profile ||
      profile.phoneVerificationCode !== code ||
      !profile.phoneVerificationCodeExpiry ||
      profile.phoneVerificationCodeExpiry < new Date()
    ) {
      throw new BadRequestException('Invalid or expired code');
    }
    await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        isPhoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationCodeExpiry: null,
      },
    });
    return true;
  }
}
