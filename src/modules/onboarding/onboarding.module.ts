import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingResolver } from './onboarding.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'changeme' }),
  ],
  providers: [
    OnboardingService,
    OnboardingResolver,
    PrismaService,
    NotificationService,
  ],
})
export class OnboardingModule {}
