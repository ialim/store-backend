import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from '../users/dto/create-user.input';
import { AuthResponse } from '../auth/dto/auth-response.output';
import { UpdateCustomerProfileInput } from './dto/update-customer-profile.input';
import { ApplyResellerInput } from './dto/apply-reseller.input';
import { ApproveResellerInput } from './dto/approve-reseller.input';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async signupCustomer(input: CreateUserInput): Promise<AuthResponse> {
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    if (!customerRole) throw new NotFoundException('Customer role not found');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: bcrypt.hashSync(input.password, 10), // hash in real use
        roleId: customerRole.id,
        customerProfile: {
          create: {
            fullName: '',
            email: input.email,
            profileStatus: 'PENDING',
          },
        },
      },
      include: { customerProfile: true },
    });

    await this.notificationService.createNotification(
      user.id,
      'CUSTOMER_SIGNUP',
      'Welcome! Please complete your profile to start ordering.',
    );

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    });
    return { accessToken: token, user };
  }

  async completeCustomerProfile(
    userId: string,
    data: UpdateCustomerProfileInput,
  ) {
    const profile = await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        birthday: data.birthday,
        preferredStoreId: data.preferredStoreId,
        profileStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await this.notificationService.createNotification(
      userId,
      'PROFILE_ACTIVATED',
      'Your customer profile is now active!',
    );

    return profile;
  }

  async applyReseller(input: ApplyResellerInput) {
    const resellerRole = await this.prisma.role.findUnique({
      where: { name: 'RESELLER' },
    });
    if (!resellerRole) throw new NotFoundException('Reseller role not found');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.password,
        roleId: resellerRole.id,
        resellerProfile: {
          create: {
            billerId: input.billerId,
            tier: input.tier,
            creditLimit: input.creditLimit,
            profileStatus: 'PENDING',
          },
        },
      },
      include: { resellerProfile: true },
    });

    await this.notificationService.createNotification(
      user.id,
      'RESELLER_APPLIED',
      'Your reseller application is pending approval.',
    );

    return user.resellerProfile;
  }

  async approveReseller(resellerId: string, input: ApproveResellerInput) {
    const profile = await this.prisma.resellerProfile.update({
      where: { userId: resellerId },
      data: {
        tier: input.tier,
        creditLimit: input.creditLimit,
        profileStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await this.notificationService.createNotification(
      resellerId,
      'RESELLER_APPROVED',
      'Congrats! Your reseller account has been approved.',
    );

    return profile;
  }
}
