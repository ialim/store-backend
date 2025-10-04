import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingResolver } from './onboarding.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'changeme' }),
    NotificationModule,
    AuthModule,
    VerificationModule,
  ],
  providers: [OnboardingService, OnboardingResolver, PrismaService],
})
export class OnboardingModule {}
