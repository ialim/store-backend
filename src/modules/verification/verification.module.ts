import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationResolver } from './verification.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    VerificationService,
    VerificationResolver,
    PrismaService,
    EmailService,
    SmsService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
