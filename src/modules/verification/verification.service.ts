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
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await this.emailService.sendMail(
      user.email,
      'Verify Your Email',
      `Click here to verify your email: ${link}`,
    );
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
